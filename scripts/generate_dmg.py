#!/usr/bin/env python3
"""
Generates a valid ISO-9660 Disk Image (.dmg) for macOS.
macOS DiskImageMounter natively mounts ISO-9660 format as an official volume.
"""
import os
import struct
import time

SECTOR_SIZE = 2048

def pad_sector(data):
    rem = len(data) % SECTOR_SIZE
    if rem > 0:
        return data + b'\x00' * (SECTOR_SIZE - rem)
    return data

def both_endian_16(val):
    return struct.pack('<H', val) + struct.pack('>H', val)

def both_endian_32(val):
    return struct.pack('<I', val) + struct.pack('>I', val)

def make_iso_date():
    t = time.gmtime()
    # YYYYMMDDHHMMSS00 + timezone offset (0 for UTC)
    s = f"{t.tm_year:04d}{t.tm_mon:02d}{t.tm_mday:02d}{t.tm_hour:02d}{t.tm_min:02d}{t.tm_sec:02d}00"
    return s.encode('ascii') + b'\x00'

def make_dir_date():
    t = time.gmtime()
    return struct.pack('BBBBBBb', t.tm_year - 1900, t.tm_mon, t.tm_mday, t.tm_hour, t.tm_min, t.tm_sec, 0)

def build_directory_record(extent_location, data_length, flags, identifier):
    id_bytes = identifier if isinstance(identifier, bytes) else identifier.encode('ascii')
    id_len = len(id_bytes)
    record_len = 33 + id_len
    if record_len % 2 != 0:
        record_len += 1  # padding byte
    
    rec = bytearray(record_len)
    rec[0] = record_len
    rec[1] = 0  # Ext attribute record len
    rec[2:10] = both_endian_32(extent_location)
    rec[10:18] = both_endian_32(data_length)
    rec[18:25] = make_dir_date()
    rec[25] = flags  # 2 = directory, 0 = file
    rec[26] = 0  # File unit size
    rec[27] = 0  # Interleave gap
    rec[28:32] = both_endian_16(1)  # Volume sequence number
    rec[32] = id_len
    rec[33:33+id_len] = id_bytes
    return bytes(rec)

def main():
    os.makedirs('public/downloads', exist_ok=True)
    out_path = 'public/downloads/MFA-Reading-Challenge.dmg'
    
    # Payload: A README and macOS Launcher script
    launcher_script = (
        "#!/bin/bash\n"
        "# MFA Reading Challenge Launcher\n"
        "open \"https://ais-dev-6ebcmlzpakcvtltn4zlof4-370442547753.europe-west2.run.app\"\n"
    ).encode('utf-8')
    
    readme_txt = (
        "M-PESA Foundation Academy 45-Book Reading Challenge\n"
        "===================================================\n\n"
        "Welcome to the official offline & desktop access image!\n\n"
        "To open the challenge:\n"
        "1. Double-click 'MFA_LAUNCHER.command' in this disk image.\n"
        "2. Or add to your Dock via Safari: Safari -> File -> Add to Dock.\n\n"
        "Happy Reading!\n"
    ).encode('utf-8')

    # Sector Layout:
    # 0 - 15: System area (32768 bytes)
    # 16: Primary Volume Descriptor (PVD)
    # 17: Volume Descriptor Set Terminator
    # 18: L-Path Table & M-Path Table
    # 19: Root Directory
    # 20: Launcher script file
    # 21: Readme file
    
    sec_pvd = 16
    sec_term = 17
    sec_path = 18
    sec_root = 19
    sec_launcher = 20
    sec_readme = 21
    total_sectors = 22
    
    volume_size_bytes = total_sectors * SECTOR_SIZE
    
    # 1. Root directory records
    root_dot = build_directory_record(sec_root, SECTOR_SIZE, 0x02, b'\x00')
    root_dotdot = build_directory_record(sec_root, SECTOR_SIZE, 0x02, b'\x01')
    rec_launcher = build_directory_record(sec_launcher, len(launcher_script), 0x00, "MFA_LAUNCHER.COMMAND;1")
    rec_readme = build_directory_record(sec_readme, len(readme_txt), 0x00, "README.TXT;1")
    
    root_sector_data = root_dot + root_dotdot + rec_launcher + rec_readme
    root_sector_data = root_sector_data + b'\x00' * (SECTOR_SIZE - len(root_sector_data))
    
    # 2. Path tables
    # Record: len of id, 0, loc of extent, parent dir num, id
    l_path = bytearray()
    l_path.append(1)  # len of root id
    l_path.append(0)  # ext attr len
    l_path.extend(struct.pack('<I', sec_root))
    l_path.extend(struct.pack('<H', 1))  # parent index
    l_path.append(0)  # root id
    l_path.append(0)  # pad to even
    
    m_path = bytearray()
    m_path.append(1)
    m_path.append(0)
    m_path.extend(struct.pack('>I', sec_root))
    m_path.extend(struct.pack('>H', 1))
    m_path.append(0)
    m_path.append(0)
    
    path_sector_data = bytes(l_path) + b'\x00' * (SECTOR_SIZE // 2 - len(l_path)) + bytes(m_path)
    path_sector_data = path_sector_data + b'\x00' * (SECTOR_SIZE - len(path_sector_data))
    
    # 3. PVD
    pvd = bytearray(SECTOR_SIZE)
    pvd[0] = 0x01  # Primary Volume Descriptor
    pvd[1:6] = b"CD001"
    pvd[6] = 0x01  # version
    pvd[7] = 0x00
    pvd[8:40] = b"APPLE MAC-OS                        "  # System ID (32)
    pvd[40:72] = b"MFA_READING_CHALLENGE           "  # Volume ID (32)
    pvd[80:88] = both_endian_32(total_sectors)
    pvd[120:124] = both_endian_16(1)  # Volume set size
    pvd[124:128] = both_endian_16(1)  # Volume sequence number
    pvd[128:132] = both_endian_16(SECTOR_SIZE)  # Logical block size
    pvd[132:140] = both_endian_32(len(l_path))  # Path table size
    pvd[140:144] = struct.pack('<I', sec_path)  # L Path Table
    pvd[148:152] = struct.pack('>I', sec_path)  # M Path Table
    
    # Root directory record in PVD (34 bytes)
    pvd_root_rec = build_directory_record(sec_root, SECTOR_SIZE, 0x02, b'\x00')
    pvd[156:156+len(pvd_root_rec)] = pvd_root_rec
    
    # Volume Set ID (128 bytes)
    pvd[190:318] = b"MFA_CHALLENGE".ljust(128)
    pvd[318:446] = b"MPESA_FOUNDATION_ACADEMY".ljust(128)
    pvd[446:574] = b"MFA_LIBRARIAN".ljust(128)
    pvd[574:702] = b"MFA_READING_CHALLENGE".ljust(128)
    
    date_str = make_iso_date()
    pvd[813:830] = date_str  # Volume Creation Date
    pvd[830:847] = date_str  # Volume Modification Date
    pvd[847:864] = b"0000000000000000\x00"  # Expiration Date
    pvd[864:881] = date_str  # Effective Date
    pvd[881] = 0x01  # File Structure Version
    
    # 4. Terminator
    term = bytearray(SECTOR_SIZE)
    term[0] = 0xFF
    term[1:6] = b"CD001"
    term[6] = 0x01
    
    # Assemble image
    with open(out_path, 'wb') as f:
        # Sectors 0-15: System area
        f.write(b'\x00' * (16 * SECTOR_SIZE))
        # Sector 16: PVD
        f.write(bytes(pvd))
        # Sector 17: Terminator
        f.write(bytes(term))
        # Sector 18: Path tables
        f.write(path_sector_data)
        # Sector 19: Root Directory
        f.write(root_sector_data)
        # Sector 20: Launcher
        f.write(pad_sector(launcher_script))
        # Sector 21: Readme
        f.write(pad_sector(readme_txt))
        
    print(f"Successfully generated DMG: {out_path} ({os.path.getsize(out_path)} bytes)")

if __name__ == '__main__':
    main()
