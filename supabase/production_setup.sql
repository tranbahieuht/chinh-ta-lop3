-- Canonical production schema for the Chính tả lớp 3 backend.
-- supabase/production_setup.sql is generated as an exact copy of this migration
-- so SQL Editor setup and CLI migration setup cannot drift.
create extension if not exists pgcrypto;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  student_code text not null unique check (student_code ~ '^[A-Za-z0-9_-]{1,64}$'),
  display_name text not null default 'Học sinh',
  class_name text not null default 'Chưa xếp lớp' check (char_length(class_name) between 1 and 40),
  total_xp integer not null default 0 check (total_xp >= 0),
  level integer not null default 1 check (level >= 1),
  current_week smallint not null default 1 check (current_week between 1 and 35),
  streak integer not null default 0 check (streak >= 0),
  longest_streak integer not null default 0 check (longest_streak >= 0),
  last_activity_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.week_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  week smallint not null check (week between 1 and 35),
  topic text not null,
  status text not null default 'in_progress' check (status in ('not_started', 'in_progress', 'completed')),
  xp_earned integer not null default 0 check (xp_earned >= 0),
  score integer not null default 0 check (score >= 0),
  correct_count integer not null default 0 check (correct_count >= 0),
  wrong_count integer not null default 0 check (wrong_count >= 0),
  hints_used integer not null default 0 check (hints_used >= 0),
  highest_difficulty text not null default 'basic',
  mastery_score integer not null default 50 check (mastery_score between 0 and 100),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, week)
);

create table if not exists public.answer_history (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  student_id uuid not null references public.students(id) on delete cascade,
  week smallint not null check (week between 1 and 35),
  question_id text not null,
  topic text not null,
  answer text not null default '',
  correct boolean not null,
  attempt integer not null check (attempt >= 1),
  hint_level integer not null check (hint_level between 0 and 3),
  difficulty text not null,
  xp_earned integer not null check (xp_earned between 0 and 10),
  mastery_signal text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.topic_mastery (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  topic text not null,
  mastery_score integer not null default 50 check (mastery_score between 0 and 100),
  total_questions integer not null default 0 check (total_questions >= 0),
  correct_first_try integer not null default 0 check (correct_first_try >= 0),
  correct_after_hint integer not null default 0 check (correct_after_hint >= 0),
  wrong_answers integer not null default 0 check (wrong_answers >= 0),
  hints_used integer not null default 0 check (hints_used >= 0),
  updated_at timestamptz not null default now(),
  unique (student_id, topic)
);

create table if not exists public.badges (
  id uuid primary key default gen_random_uuid(),
  badge_code text not null unique,
  name text not null,
  description text not null,
  icon text not null,
  condition_type text not null,
  condition_value integer not null default 1
);

create table if not exists public.student_badges (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  badge_id uuid not null references public.badges(id) on delete cascade,
  earned_at timestamptz not null default now(),
  unique (student_id, badge_id)
);

-- Atomic idempotency key and XP ledger. Weekly leaderboards read this table.
create table if not exists public.learning_events (
  id uuid primary key default gen_random_uuid(),
  event_id text not null unique,
  student_id uuid not null references public.students(id) on delete cascade,
  event_type text not null,
  week smallint check (week between 1 and 35),
  topic text not null default '',
  xp_awarded integer not null default 0 check (xp_awarded >= 0),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create unique index if not exists learning_events_one_week_completion
  on public.learning_events (student_id, week)
  where event_type = 'WEEK_COMPLETE';
create index if not exists students_class_xp_idx on public.students (class_name, total_xp desc);
create index if not exists week_progress_student_status_idx on public.week_progress (student_id, status);
create index if not exists answer_history_student_created_idx on public.answer_history (student_id, created_at desc);
create index if not exists topic_mastery_student_score_idx on public.topic_mastery (student_id, mastery_score);
create index if not exists learning_events_weekly_idx on public.learning_events (created_at, student_id);

insert into public.badges (badge_code, name, description, icon, condition_type, condition_value) values
  ('FIRST_WEEK', 'Tuần đầu tiên', 'Hoàn thành tuần học đầu tiên.', '🌟', 'completed_weeks', 1),
  ('NO_HINT_10', 'Tự lực', 'Đúng 10 câu mà không dùng gợi ý.', '🧠', 'correct_no_hint', 10),
  ('PERFECT_10', 'Chuỗi hoàn hảo', 'Đúng 10 câu liên tiếp.', '💯', 'correct_streak', 10),
  ('COMEBACK', 'Không bỏ cuộc', 'Tự sửa đúng sau khi sai ít nhất 5 lần.', '💪', 'correct_after_retry', 5),
  ('STREAK_3', 'Chăm học 3 ngày', 'Học liên tiếp 3 ngày.', '🔥', 'daily_streak', 3),
  ('STREAK_7', 'Chăm học 7 ngày', 'Học liên tiếp 7 ngày.', '🚀', 'daily_streak', 7),
  ('MASTER_CK', 'Bậc thầy c/k', 'Đạt mastery c/k từ 90.', '🏅', 'topic_mastery', 90),
  ('BOSS_HKI', 'Chinh phục Boss HKI', 'Hoàn thành tuần 18.', '👑', 'completed_week', 18),
  ('FINAL_BOSS', 'Chinh phục Final Boss', 'Hoàn thành tuần 35.', '🏆', 'completed_week', 35)
on conflict (badge_code) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  condition_type = excluded.condition_type,
  condition_value = excluded.condition_value;

create or replace function public.chinh_ta_touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists students_touch_updated_at on public.students;
create trigger students_touch_updated_at before update on public.students
for each row execute function public.chinh_ta_touch_updated_at();
drop trigger if exists week_progress_touch_updated_at on public.week_progress;
create trigger week_progress_touch_updated_at before update on public.week_progress
for each row execute function public.chinh_ta_touch_updated_at();
drop trigger if exists topic_mastery_touch_updated_at on public.topic_mastery;
create trigger topic_mastery_touch_updated_at before update on public.topic_mastery
for each row execute function public.chinh_ta_touch_updated_at();

create or replace function public.chinh_ta_calculate_level(p_total_xp integer)
returns integer language sql immutable as $$
  select case
    when greatest(p_total_xp, 0) < 100 then 1
    when p_total_xp < 250 then 2
    when p_total_xp < 450 then 3
    when p_total_xp < 700 then 4
    else 5 + floor((p_total_xp - 700) / 350.0)::integer
  end;
$$;

create or replace function public.chinh_ta_answer_xp(
  p_correct boolean, p_attempt integer, p_hint_level integer, p_event_type text
) returns integer language sql immutable as $$
  select case
    when not p_correct or p_event_type = 'ANSWER_REVEALED' then 0
    when p_hint_level >= 3 then 3
    when p_hint_level = 2 then 5
    when p_hint_level = 1 then 7
    when p_attempt <= 1 then 10
    else 8
  end;
$$;

create or replace function public.chinh_ta_mastery_delta(
  p_correct boolean, p_attempt integer, p_hint_level integer
) returns integer language sql immutable as $$
  select case
    when not p_correct then -5
    when p_hint_level >= 3 then 0
    when p_hint_level = 2 then 1
    when p_hint_level = 1 then 3
    when p_attempt > 1 then 5
    else 8
  end;
$$;

create or replace function public.chinh_ta_difficulty_rank(p_value text)
returns integer language sql immutable as $$
  select case lower(coalesce(p_value, ''))
    when 'hard' then 5 when 'medium' then 4 when 'example' then 3
    when 'basic_support' then 2 else 1 end;
$$;

create or replace function public.chinh_ta_award_badges(p_student_id uuid)
returns text[] language plpgsql security definer set search_path = public as $$
declare
  candidate record;
  earned_codes text[] := array[]::text[];
begin
  for candidate in
    select b.id, b.badge_code
    from badges b
    where case b.badge_code
      when 'FIRST_WEEK' then exists (select 1 from week_progress w where w.student_id = p_student_id and w.status = 'completed')
      when 'NO_HINT_10' then (select count(*) from answer_history a where a.student_id = p_student_id and a.correct and a.hint_level = 0) >= 10
      when 'PERFECT_10' then coalesce((select count(*) = 10 and bool_and(x.correct) from (select a.correct from answer_history a where a.student_id = p_student_id order by a.created_at desc limit 10) x), false)
      when 'COMEBACK' then (select count(*) from answer_history a where a.student_id = p_student_id and a.correct and a.attempt > 1) >= 5
      when 'STREAK_3' then (select s.streak from students s where s.id = p_student_id) >= 3
      when 'STREAK_7' then (select s.streak from students s where s.id = p_student_id) >= 7
      when 'MASTER_CK' then exists (select 1 from topic_mastery t where t.student_id = p_student_id and regexp_replace(lower(t.topic), '[^a-z]', '', 'g') = 'ck' and t.mastery_score >= 90)
      when 'BOSS_HKI' then exists (select 1 from week_progress w where w.student_id = p_student_id and w.week = 18 and w.status = 'completed')
      when 'FINAL_BOSS' then exists (select 1 from week_progress w where w.student_id = p_student_id and w.week = 35 and w.status = 'completed')
      else false end
  loop
    insert into student_badges (student_id, badge_id)
    values (p_student_id, candidate.id)
    on conflict (student_id, badge_id) do nothing;
    if found then earned_codes := array_append(earned_codes, candidate.badge_code); end if;
  end loop;
  return earned_codes;
end;
$$;

create or replace function public.chinh_ta_record_answer(
  p_event_id text,
  p_student_code text,
  p_display_name text,
  p_class_name text,
  p_week integer,
  p_question_id text,
  p_topic text,
  p_answer text,
  p_correct boolean,
  p_attempt integer,
  p_hint_level integer,
  p_difficulty text,
  p_mastery_signal text,
  p_event_type text default 'ANSWER_RESULT',
  p_occurred_at timestamptz default now()
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  learner students%rowtype;
  previous_level integer;
  awarded_xp integer;
  mastery integer;
  new_badges text[];
  event_time timestamptz := coalesce(p_occurred_at, now());
  current_day date := (coalesce(p_occurred_at, now()) at time zone 'Asia/Ho_Chi_Minh')::date;
  previous_day date;
begin
  if coalesce(p_event_id, '') = '' or p_week not between 1 and 35 or p_attempt < 1 or p_hint_level not between 0 and 3 then
    raise exception 'Invalid learning event';
  end if;

  insert into students (student_code, display_name, class_name)
  values (p_student_code, coalesce(nullif(p_display_name, ''), 'Học sinh'), coalesce(nullif(p_class_name, ''), 'Chưa xếp lớp'))
  on conflict (student_code) do update set
    display_name = case when coalesce(p_display_name, '') <> '' then p_display_name else students.display_name end,
    class_name = case when coalesce(p_class_name, '') <> '' then p_class_name else students.class_name end
  returning * into learner;
  select * into learner from students where id = learner.id for update;

  if exists (select 1 from learning_events where event_id = p_event_id) then
    select mastery_score into mastery from topic_mastery where student_id = learner.id and topic = p_topic;
    return jsonb_build_object('success', true, 'duplicate', true, 'studentId', learner.id,
      'xpEarned', 0, 'totalXP', learner.total_xp, 'level', learner.level, 'levelUp', false,
      'mastery', coalesce(mastery, 50), 'streak', learner.streak, 'newBadges', '[]'::jsonb);
  end if;

  previous_level := learner.level;
  awarded_xp := chinh_ta_answer_xp(p_correct, p_attempt, p_hint_level, p_event_type);
  insert into learning_events (event_id, student_id, event_type, week, topic, xp_awarded, payload, created_at)
  values (p_event_id, learner.id, p_event_type, p_week, p_topic, awarded_xp,
    jsonb_build_object('questionId', p_question_id, 'correct', p_correct, 'attempt', p_attempt,
      'hintLevel', p_hint_level, 'difficulty', p_difficulty), event_time);
  insert into answer_history (event_id, student_id, week, question_id, topic, answer, correct, attempt,
    hint_level, difficulty, xp_earned, mastery_signal, created_at)
  values (p_event_id, learner.id, p_week, p_question_id, p_topic, coalesce(p_answer, ''), p_correct,
    p_attempt, p_hint_level, p_difficulty, awarded_xp, coalesce(p_mastery_signal, ''), event_time);

  previous_day := case when learner.last_activity_at is null then null else (learner.last_activity_at at time zone 'Asia/Ho_Chi_Minh')::date end;
  learner.streak := case when previous_day = current_day then greatest(1, learner.streak)
    when previous_day = current_day - 1 then greatest(1, learner.streak + 1) else 1 end;
  learner.longest_streak := greatest(learner.longest_streak, learner.streak);
  learner.total_xp := learner.total_xp + awarded_xp;
  learner.level := chinh_ta_calculate_level(learner.total_xp);
  update students set total_xp = learner.total_xp, level = learner.level,
    current_week = greatest(current_week, p_week), streak = learner.streak,
    longest_streak = learner.longest_streak, last_activity_at = event_time
  where id = learner.id;

  insert into topic_mastery (student_id, topic, mastery_score, total_questions, correct_first_try,
    correct_after_hint, wrong_answers, hints_used)
  values (learner.id, p_topic, greatest(0, least(100, 50 + chinh_ta_mastery_delta(p_correct, p_attempt, p_hint_level))),
    1, case when p_correct and p_attempt = 1 and p_hint_level = 0 then 1 else 0 end,
    case when p_correct and (p_attempt > 1 or p_hint_level > 0) then 1 else 0 end,
    case when not p_correct then 1 else 0 end, p_hint_level)
  on conflict (student_id, topic) do update set
    mastery_score = greatest(0, least(100, topic_mastery.mastery_score + chinh_ta_mastery_delta(p_correct, p_attempt, p_hint_level))),
    total_questions = topic_mastery.total_questions + 1,
    correct_first_try = topic_mastery.correct_first_try + case when p_correct and p_attempt = 1 and p_hint_level = 0 then 1 else 0 end,
    correct_after_hint = topic_mastery.correct_after_hint + case when p_correct and (p_attempt > 1 or p_hint_level > 0) then 1 else 0 end,
    wrong_answers = topic_mastery.wrong_answers + case when not p_correct then 1 else 0 end,
    hints_used = topic_mastery.hints_used + p_hint_level
  returning mastery_score into mastery;

  insert into week_progress (student_id, week, topic, status, xp_earned, score, correct_count,
    wrong_count, hints_used, highest_difficulty, mastery_score)
  values (learner.id, p_week, p_topic, 'in_progress', awarded_xp,
    case when p_correct then 10 else 0 end, case when p_correct then 1 else 0 end,
    case when p_correct then 0 else 1 end, p_hint_level, p_difficulty, mastery)
  on conflict (student_id, week) do update set
    topic = excluded.topic,
    xp_earned = week_progress.xp_earned + excluded.xp_earned,
    score = week_progress.score + excluded.score,
    correct_count = week_progress.correct_count + excluded.correct_count,
    wrong_count = week_progress.wrong_count + excluded.wrong_count,
    hints_used = week_progress.hints_used + excluded.hints_used,
    highest_difficulty = case when chinh_ta_difficulty_rank(excluded.highest_difficulty) > chinh_ta_difficulty_rank(week_progress.highest_difficulty) then excluded.highest_difficulty else week_progress.highest_difficulty end,
    mastery_score = excluded.mastery_score;

  new_badges := chinh_ta_award_badges(learner.id);
  return jsonb_build_object('success', true, 'duplicate', false, 'studentId', learner.id,
    'xpEarned', awarded_xp, 'totalXP', learner.total_xp, 'level', learner.level,
    'levelUp', learner.level > previous_level, 'mastery', mastery, 'streak', learner.streak,
    'newBadges', to_jsonb(new_badges));
end;
$$;

create or replace function public.chinh_ta_complete_week(
  p_event_id text,
  p_student_code text,
  p_display_name text,
  p_class_name text,
  p_week integer,
  p_topic text,
  p_occurred_at timestamptz default now()
) returns jsonb language plpgsql security definer set search_path = public as $$
declare
  learner students%rowtype;
  progress week_progress%rowtype;
  previous_level integer;
  bonus integer;
  mastery integer;
  new_badges text[];
  event_time timestamptz := coalesce(p_occurred_at, now());
  current_day date := (coalesce(p_occurred_at, now()) at time zone 'Asia/Ho_Chi_Minh')::date;
  previous_day date;
begin
  if coalesce(p_event_id, '') = '' or p_week not between 1 and 35 then raise exception 'Invalid week completion event'; end if;
  insert into students (student_code, display_name, class_name)
  values (p_student_code, coalesce(nullif(p_display_name, ''), 'Học sinh'), coalesce(nullif(p_class_name, ''), 'Chưa xếp lớp'))
  on conflict (student_code) do update set
    display_name = case when coalesce(p_display_name, '') <> '' then p_display_name else students.display_name end,
    class_name = case when coalesce(p_class_name, '') <> '' then p_class_name else students.class_name end
  returning * into learner;
  select * into learner from students where id = learner.id for update;
  select * into progress from week_progress where student_id = learner.id and week = p_week;

  if exists (select 1 from learning_events where event_id = p_event_id) or progress.status = 'completed' then
    select mastery_score into mastery from topic_mastery where student_id = learner.id and topic = p_topic;
    return jsonb_build_object('success', true, 'duplicate', true, 'studentId', learner.id,
      'xpEarned', 0, 'totalXP', learner.total_xp, 'level', learner.level, 'levelUp', false,
      'mastery', coalesce(mastery, 50), 'streak', learner.streak, 'newBadges', '[]'::jsonb);
  end if;

  previous_level := learner.level;
  bonus := 30 + case when progress.id is not null and progress.hints_used = 0 then 20 else 0 end;
  insert into learning_events (event_id, student_id, event_type, week, topic, xp_awarded, created_at)
  values (p_event_id, learner.id, 'WEEK_COMPLETE', p_week, p_topic, bonus, event_time);

  previous_day := case when learner.last_activity_at is null then null else (learner.last_activity_at at time zone 'Asia/Ho_Chi_Minh')::date end;
  learner.streak := case when previous_day = current_day then greatest(1, learner.streak)
    when previous_day = current_day - 1 then greatest(1, learner.streak + 1) else 1 end;
  learner.longest_streak := greatest(learner.longest_streak, learner.streak);
  learner.total_xp := learner.total_xp + bonus;
  learner.level := chinh_ta_calculate_level(learner.total_xp);
  update students set total_xp = learner.total_xp, level = learner.level,
    current_week = case when p_week >= current_week and p_week < 35 then p_week + 1 else current_week end,
    streak = learner.streak, longest_streak = learner.longest_streak, last_activity_at = event_time
  where id = learner.id;

  insert into week_progress (student_id, week, topic, status, xp_earned, completed_at)
  values (learner.id, p_week, p_topic, 'completed', bonus, event_time)
  on conflict (student_id, week) do update set status = 'completed',
    xp_earned = week_progress.xp_earned + bonus, completed_at = coalesce(week_progress.completed_at, event_time);
  select mastery_score into mastery from topic_mastery where student_id = learner.id and topic = p_topic;
  new_badges := chinh_ta_award_badges(learner.id);
  return jsonb_build_object('success', true, 'duplicate', false, 'studentId', learner.id,
    'xpEarned', bonus, 'totalXP', learner.total_xp, 'level', learner.level,
    'levelUp', learner.level > previous_level, 'mastery', coalesce(mastery, 50),
    'streak', learner.streak, 'newBadges', to_jsonb(new_badges));
end;
$$;

alter table public.students enable row level security;
alter table public.week_progress enable row level security;
alter table public.answer_history enable row level security;
alter table public.topic_mastery enable row level security;
alter table public.badges enable row level security;
alter table public.student_badges enable row level security;
alter table public.learning_events enable row level security;

-- The browser does not query these tables directly. With RLS enabled and no
-- client policies, only the server-side service role can access learner data.
revoke all on table public.students from anon, authenticated;
revoke all on table public.week_progress from anon, authenticated;
revoke all on table public.answer_history from anon, authenticated;
revoke all on table public.topic_mastery from anon, authenticated;
revoke all on table public.badges from anon, authenticated;
revoke all on table public.student_badges from anon, authenticated;
revoke all on table public.learning_events from anon, authenticated;
grant all on table public.students to service_role;
grant all on table public.week_progress to service_role;
grant all on table public.answer_history to service_role;
grant all on table public.topic_mastery to service_role;
grant all on table public.badges to service_role;
grant all on table public.student_badges to service_role;
grant all on table public.learning_events to service_role;

revoke all on function public.chinh_ta_award_badges(uuid) from public, anon, authenticated;
grant execute on function public.chinh_ta_award_badges(uuid) to service_role;
revoke all on function public.chinh_ta_record_answer(text,text,text,text,integer,text,text,text,boolean,integer,integer,text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.chinh_ta_complete_week(text,text,text,text,integer,text,timestamptz) from public, anon, authenticated;
grant execute on function public.chinh_ta_record_answer(text,text,text,text,integer,text,text,text,boolean,integer,integer,text,text,text,timestamptz) to service_role;
grant execute on function public.chinh_ta_complete_week(text,text,text,text,integer,text,timestamptz) to service_role;
