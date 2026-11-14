ALTER TABLE public.challenges DROP CONSTRAINT IF EXISTS challenges_challenge_type_check;
INSERT INTO public.challenges (id,title,description,challenge_type,start_date,end_date,target_books,points_reward,created_by,is_active,is_featured,category,badge_name,badge_icon,accent_color,layout_config)
SELECT '45450000-2025-4026-8000-000000000045','45-Book Reading Challenge 2025/2026: Beyond the Pages',
'The academy-wide reading quest. Read 45 books across the literary realms to earn Bronze, Silver and Gold awards.',
'individual','2025-09-01','2026-07-01',45,450,
(SELECT user_id FROM public.profiles WHERE role='librarian' ORDER BY created_at LIMIT 1),
true,true,'Whole School','Master Reader','👑','var(--v-gold)',
'{"status":"open","submission_type":"book","points_per_book":3,"min_reflection_chars":50,"max_books_per_category":4,"level_milestones":{"bronze":15,"silver":30,"gold":45},"certificate_release_policy":"on_close_only"}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM public.challenges WHERE id='45450000-2025-4026-8000-000000000045');