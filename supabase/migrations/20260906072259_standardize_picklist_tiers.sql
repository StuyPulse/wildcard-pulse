begin;

-- The shared picklist uses one fixed, universally understood tier set.
update public.picklist_categories
set name = 'DNP'
where lower(name) = 'do not pick'
  and not exists (
    select 1 from public.picklist_categories as existing
    where existing.organization_id = picklist_categories.organization_id
      and upper(existing.name) = 'DNP'
  );

delete from public.picklist_categories
where upper(name) not in ('ELITE', 'GOOD', 'MID', 'MEH', 'SNS', 'DNP');

update public.picklist_categories
set sort_order = case upper(name)
      when 'ELITE' then 0
      when 'GOOD' then 1
      when 'MID' then 2
      when 'MEH' then 3
      when 'SNS' then 4
      when 'DNP' then 5
    end,
    color = case upper(name)
      when 'ELITE' then '#f59e0b'
      when 'GOOD' then '#22c55e'
      when 'MID' then '#3b82f6'
      when 'MEH' then '#64748b'
      when 'SNS' then '#8b5cf6'
      when 'DNP' then '#ef4444'
    end;

-- Seed the first shared board with arbitrary, evenly distributed tiering.
with randomized as (
  select id, organization_id, event_id,
    case (row_number() over (partition by event_id order by md5(team_id::text || event_id::text)) - 1) % 6
      when 0 then 'ELITE'
      when 1 then 'GOOD'
      when 2 then 'MID'
      when 3 then 'MEH'
      when 4 then 'SNS'
      else 'DNP'
    end as tier_name
  from public.shared_picklist_rankings
), tiers as (
  select id, organization_id, upper(name) as tier_name
  from public.picklist_categories
)
update public.shared_picklist_rankings as ranking
set category_id = tiers.id
from randomized
join tiers on tiers.organization_id = randomized.organization_id and tiers.tier_name = randomized.tier_name
where ranking.id = randomized.id;

commit;
