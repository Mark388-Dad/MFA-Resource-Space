
CREATE OR REPLACE VIEW public.leaderboard_view
WITH (security_invoker=off) AS
SELECT
  p.user_id,
  p.full_name,
  p.house::text AS house,
  p.year_group::text AS year_group,
  p.class_name,
  p.avatar_url,
  COALESCE(s.books, 0)::int AS books,
  COALESCE(s.points, 0)::int AS points
FROM public.profiles p
LEFT JOIN (
  SELECT user_id, COUNT(*) AS books, SUM(points_earned) AS points
  FROM public.book_submissions
  GROUP BY user_id
) s ON s.user_id = p.user_id
WHERE p.role = 'student';

GRANT SELECT ON public.leaderboard_view TO authenticated;
