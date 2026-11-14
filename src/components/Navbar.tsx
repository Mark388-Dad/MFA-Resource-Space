import AppShell from "@/components/AppSidebar";

// Backward-compatible: pages render <Navbar /> at the top and the rest of their
// content below. We wrap the entire page in AppShell via a portal-like effect.
// To keep changes minimal, Navbar renders nothing here, and we provide a layout
// wrapper below. Existing pages already wrap their content in a parent div, so
// we instead adopt the approach of rendering AppShell as a fixed shell and
// hiding Navbar's own UI.
const Navbar = () => null;

export default Navbar;
export { AppShell };
