-- Build prompt 4: forecasts come from the venue, not the phone.
--
-- A few common Calgary and Bow Valley cross-country venues, shared with every
-- skier (user_id null; nobody can edit or claim them). Elevation is the trail
-- height, passed to the forecast so it is not the average height of a
-- mountain grid cell. Anyone can add their own venues with exact positions.

alter table public.venues add column region text;

insert into public.venues (user_id, name, region, latitude, longitude, elevation_m, typical_snow) values
  (null, 'Canmore Nordic Centre', 'Canmore, AB', 51.08870, -115.38930, 1400, 'mixed'),
  (null, 'Lake Louise', 'Banff National Park, AB', 51.42540, -116.17730, 1540, 'natural'),
  (null, 'Mount Shark', 'Kananaskis, AB', 50.86550, -115.41650, 1780, 'natural'),
  (null, 'Peter Lougheed (Pocaterra)', 'Kananaskis, AB', 50.71500, -115.12400, 1700, 'natural'),
  (null, 'WinSport (Canada Olympic Park)', 'Calgary, AB', 51.08160, -114.21470, 1180, 'man_made'),
  (null, 'Confederation Park', 'Calgary, AB', 51.08600, -114.09000, 1080, 'natural');
