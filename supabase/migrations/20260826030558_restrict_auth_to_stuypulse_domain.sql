-- This runs before the profile trigger. It applies to password signup,
-- invitations, and first-time OAuth identities (including Google).
create or replace function private.enforce_stuypulse_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or lower(new.email) !~ '^[^@[:space:]]+@stuypulse\\.com$' then
    raise exception 'Wildcard Pulse is restricted to @stuypulse.com accounts.' using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger enforce_stuypulse_email_before_user_creation
before insert on auth.users
for each row execute procedure private.enforce_stuypulse_email();
