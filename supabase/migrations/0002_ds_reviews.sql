-- Testimonials / reviews for Dreamstack (added 2026-08-21).
-- Signed-in users submit reviews (start unapproved); the owner approves them
-- from /admin; approved reviews render on the landing page.
create table if not exists public.ds_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  author_name text not null,
  role_line text,
  rating int not null check (rating between 1 and 5),
  body text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.ds_reviews enable row level security;

drop policy if exists "public reads approved reviews" on public.ds_reviews;
create policy "public reads approved reviews"
  on public.ds_reviews for select
  using (is_approved = true);

create or replace function public.ds_submit_review(
  p_name text, p_role text, p_rating int, p_body text
) returns void
  language plpgsql security definer set search_path to '' as $$
begin
  if auth.uid() is null then
    raise exception 'Please sign in to leave a review';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5';
  end if;
  if p_body is null or length(btrim(p_body)) < 4 then
    raise exception 'Please write a few words';
  end if;
  insert into public.ds_reviews (user_id, author_name, role_line, rating, body, is_approved)
  values (
    auth.uid(),
    left(coalesce(nullif(btrim(p_name), ''), 'Anonymous'), 60),
    left(nullif(btrim(p_role), ''), 80),
    p_rating,
    left(btrim(p_body), 1000),
    false
  );
end; $$;
grant execute on function public.ds_submit_review(text, text, int, text) to authenticated;

create or replace function public.ds_admin_reviews()
  returns json language plpgsql security definer set search_path to '' as $$
declare owner_ok boolean; result json;
begin
  select coalesce(is_owner, false) into owner_ok
    from public.ds_profiles where user_id = auth.uid();
  if not coalesce(owner_ok, false) then
    return json_build_object('allowed', false);
  end if;
  select json_build_object(
    'allowed', true,
    'reviews', coalesce((
      select json_agg(row_to_json(x)) from (
        select id, author_name, role_line, rating, body, is_approved, created_at
          from public.ds_reviews order by created_at desc
      ) x
    ), '[]'::json)
  ) into result;
  return result;
end; $$;
grant execute on function public.ds_admin_reviews() to authenticated, anon;

create or replace function public.ds_admin_set_review(p_id uuid, p_approved boolean)
  returns void language plpgsql security definer set search_path to '' as $$
begin
  if not coalesce((select is_owner from public.ds_profiles where user_id = auth.uid()), false) then
    raise exception 'Owners only';
  end if;
  update public.ds_reviews set is_approved = p_approved where id = p_id;
end; $$;
grant execute on function public.ds_admin_set_review(uuid, boolean) to authenticated;

create or replace function public.ds_admin_delete_review(p_id uuid)
  returns void language plpgsql security definer set search_path to '' as $$
begin
  if not coalesce((select is_owner from public.ds_profiles where user_id = auth.uid()), false) then
    raise exception 'Owners only';
  end if;
  delete from public.ds_reviews where id = p_id;
end; $$;
grant execute on function public.ds_admin_delete_review(uuid) to authenticated;
