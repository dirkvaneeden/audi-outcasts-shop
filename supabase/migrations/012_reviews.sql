-- =====================================================================
-- Stage 12: Product reviews
--   review_requests: one per order + item the admin asked a member to review
--   reviews:         the member's star rating (1-5) and description
-- Run in Supabase -> SQL Editor
-- =====================================================================

create table if not exists public.review_requests (
  id            uuid primary key default gen_random_uuid(),   -- also the link in the email
  order_id      uuid not null references public.orders (id) on delete cascade,
  member_id     uuid not null references public.members (id) on delete cascade,
  item_id       uuid not null references public.items (id) on delete cascade,
  item_name     text not null,                                -- as on the order
  item_image    text,
  sent_by       uuid references public.members (id) on delete set null,
  sent_at       timestamptz not null default now(),
  send_count    int not null default 1,
  completed_at  timestamptz,
  unique (order_id, item_id)
);
create index if not exists review_requests_member_idx on public.review_requests (member_id, completed_at);

create table if not exists public.reviews (
  id           uuid primary key default gen_random_uuid(),
  request_id   uuid unique references public.review_requests (id) on delete set null,
  item_id      uuid not null references public.items (id) on delete cascade,
  member_id    uuid not null references public.members (id) on delete cascade,
  order_id     uuid references public.orders (id) on delete set null,
  rating       int  not null check (rating between 1 and 5),
  comment      text not null default '' check (char_length(comment) <= 1000),
  hide_name    boolean not null default false,                -- show "Club member" instead of the name
  is_deleted   boolean not null default false,                -- deletion indicator (admin can hide a review)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists reviews_item_idx on public.reviews (item_id, created_at desc) where is_deleted = false;

drop trigger if exists reviews_touch on public.reviews;
create trigger reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();

alter table public.review_requests enable row level security;   -- server-only access
alter table public.reviews         enable row level security;

-- ---------- What the store shows -------------------------------------
-- Reviews not deleted, for items not deleted. The reviewer's name is only
-- exposed when they did NOT ask to hide it.
create or replace view public.reviews_public
with (security_invoker = true) as
  select r.id, r.item_id, r.rating, r.comment, r.created_at,
         case when r.hide_name then null
              else coalesce(nullif(trim(m.nickname), ''),
                            split_part(m.name, ' ', 1)
                            || case when position(' ' in trim(m.name)) > 0
                                    then ' ' || left(split_part(trim(m.name), ' ', 2), 1) || '.'
                                    else '' end)
         end as reviewer_name
  from public.reviews r
  join public.items_active i on i.id = r.item_id
  join public.members m on m.id = r.member_id
  where r.is_deleted = false;

create or replace view public.item_rating_stats
with (security_invoker = true) as
  select item_id,
         round(avg(rating)::numeric, 1) as avg_rating,
         count(*)::int                  as review_count
  from public.reviews_public
  group by item_id;
