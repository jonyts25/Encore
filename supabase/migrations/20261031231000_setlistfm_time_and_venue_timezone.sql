-- setlist.fm shows have no event time; venues outside MX should not default to CDMX.

alter table venues
  alter column timezone drop default;

alter table venues
  alter column timezone drop not null;

update shows
set time_confirmed = false
where source = 'setlistfm'
  and (show_date at time zone 'UTC')::time = time '12:00:00';

update venues v
set timezone = null
where v.timezone = 'America/Mexico_City'
  and v.country is not null
  and lower(trim(v.country)) not in ('mexico', 'méxico', 'mx');
