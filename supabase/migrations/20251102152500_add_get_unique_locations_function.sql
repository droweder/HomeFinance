
create or replace function get_unique_locations(user_id_param uuid)
returns table(location text) as $$
begin
  return query
  select distinct location from (
    select location from expenses where user_id = user_id_param and location is not null
    union
    select location from income where user_id = user_id_param and location is not null
    union
    select location from credit_card_expenses where user_id = user_id_param and location is not null
  ) as all_locations
  order by location;
end;
$$ language plpgsql;
