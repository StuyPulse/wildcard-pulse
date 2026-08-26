create or replace function private.enforce_stuypulse_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.email is null or right(lower(new.email), length('@stuypulse.com')) <> '@stuypulse.com' then
    raise exception 'Wildcard Pulse is restricted to @stuypulse.com accounts.' using errcode = '22023';
  end if;
  return new;
end;
$$;
