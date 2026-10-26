-- Allow marking a show as "did not attend" after the active window.
alter table user_shows drop constraint if exists user_shows_status_check;

alter table user_shows
  add constraint user_shows_status_check
  check (status in ('interesado', 'voy', 'fui', 'no_fui'));
