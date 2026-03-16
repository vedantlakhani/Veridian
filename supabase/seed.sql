-- DEFRA 2025 GHG Conversion Factors
-- Source: https://www.gov.uk/government/publications/greenhouse-gas-reporting-conversion-factors-2025
-- Categories: food, transport, energy
-- Units: kg (per kg of food), km (per passenger-km), kWh (electricity), m3 (gas)

INSERT INTO emission_factors (category, subcategory, item, unit, kg_co2e, source, year) VALUES

-- ============================================================
-- FOOD (kg CO2e per kg of food item)
-- ============================================================
('food', 'beef',        'Beef (average)',                   'kg', 27.0000, 'DEFRA 2025', 2025),
('food', 'lamb',        'Lamb',                             'kg', 24.5000, 'DEFRA 2025', 2025),
('food', 'pork',        'Pork',                             'kg',  7.6100, 'DEFRA 2025', 2025),
('food', 'chicken',     'Chicken',                          'kg',  5.5400, 'DEFRA 2025', 2025),
('food', 'turkey',      'Turkey',                           'kg',  5.4000, 'DEFRA 2025', 2025),
('food', 'fish',        'Fish (average)',                   'kg',  2.9000, 'DEFRA 2025', 2025),
('food', 'salmon',      'Salmon (farmed)',                  'kg',  3.3900, 'DEFRA 2025', 2025),
('food', 'tuna',        'Tuna (canned)',                    'kg',  3.0800, 'DEFRA 2025', 2025),
('food', 'prawns',      'Prawns (farmed)',                  'kg', 11.9000, 'DEFRA 2025', 2025),
('food', 'eggs',        'Eggs (per kg)',                    'kg',  3.2400, 'DEFRA 2025', 2025),
('food', 'milk',        'Milk (whole, per litre)',          'litre', 1.1400, 'DEFRA 2025', 2025),
('food', 'cheese',      'Cheese (hard)',                    'kg',  8.5300, 'DEFRA 2025', 2025),
('food', 'butter',      'Butter',                           'kg',  9.0400, 'DEFRA 2025', 2025),
('food', 'yoghurt',     'Yoghurt',                          'kg',  1.8800, 'DEFRA 2025', 2025),
('food', 'rice',        'Rice (dry weight)',                'kg',  2.6600, 'DEFRA 2025', 2025),
('food', 'pasta',       'Pasta (dry)',                      'kg',  1.2200, 'DEFRA 2025', 2025),
('food', 'bread',       'Bread (sliced white)',             'kg',  0.7500, 'DEFRA 2025', 2025),
('food', 'potatoes',    'Potatoes',                         'kg',  0.2100, 'DEFRA 2025', 2025),
('food', 'tomatoes',    'Tomatoes (fresh)',                 'kg',  1.4500, 'DEFRA 2025', 2025),
('food', 'vegetables',  'Vegetables (mixed, average)',      'kg',  0.3200, 'DEFRA 2025', 2025),
('food', 'fruit',       'Fruit (mixed, average)',           'kg',  0.4300, 'DEFRA 2025', 2025),
('food', 'nuts',        'Nuts (mixed)',                     'kg',  2.5300, 'DEFRA 2025', 2025),
('food', 'coffee',      'Coffee (roasted beans)',           'kg', 17.0000, 'DEFRA 2025', 2025),
('food', 'tea',         'Tea (dried leaves)',               'kg',  3.4100, 'DEFRA 2025', 2025),
('food', 'chocolate',   'Chocolate (milk)',                 'kg', 18.7000, 'DEFRA 2025', 2025),
('food', 'wine',        'Wine (750ml bottle)',              'bottle', 1.7200, 'DEFRA 2025', 2025),
('food', 'beer',        'Beer (pint, 568ml)',               'pint', 0.5280, 'DEFRA 2025', 2025),
('food', 'spirits',     'Spirits (25ml measure)',           'measure', 0.0630, 'DEFRA 2025', 2025),
('food', 'tofu',        'Tofu',                             'kg',  2.6500, 'DEFRA 2025', 2025),
('food', 'lentils',     'Lentils (dry)',                    'kg',  0.9000, 'DEFRA 2025', 2025),
('food', 'beans',       'Beans (dried)',                    'kg',  0.8200, 'DEFRA 2025', 2025),
('food', 'oats',        'Oats',                             'kg',  0.9500, 'DEFRA 2025', 2025),
('food', 'sugar',       'Sugar (refined)',                  'kg',  0.6700, 'DEFRA 2025', 2025),
('food', 'oil',         'Vegetable oil',                    'litre', 3.0500, 'DEFRA 2025', 2025),
('food', 'crisps',      'Crisps/chips (potato)',            'kg',  3.4000, 'DEFRA 2025', 2025),

-- ============================================================
-- TRANSPORT (kg CO2e per passenger-km unless noted)
-- ============================================================
('transport', 'car_petrol',          'Car - petrol (average)',               'km', 0.170400, 'DEFRA 2025', 2025),
('transport', 'car_diesel',          'Car - diesel (average)',               'km', 0.163700, 'DEFRA 2025', 2025),
('transport', 'car_hybrid',          'Car - petrol hybrid (average)',        'km', 0.108800, 'DEFRA 2025', 2025),
('transport', 'car_phev',            'Car - plug-in hybrid (average)',       'km', 0.068700, 'DEFRA 2025', 2025),
('transport', 'car_electric',        'Car - battery electric (average)',     'km', 0.046400, 'DEFRA 2025', 2025),
('transport', 'car_lpg',             'Car - LPG (average)',                  'km', 0.155200, 'DEFRA 2025', 2025),
('transport', 'motorcycle_small',    'Motorcycle - small (<125cc)',          'km', 0.082800, 'DEFRA 2025', 2025),
('transport', 'motorcycle_medium',   'Motorcycle - medium (125-500cc)',      'km', 0.101000, 'DEFRA 2025', 2025),
('transport', 'motorcycle_large',    'Motorcycle - large (>500cc)',          'km', 0.132100, 'DEFRA 2025', 2025),
('transport', 'bus_local',           'Bus - local (average occupancy)',      'km', 0.097200, 'DEFRA 2025', 2025),
('transport', 'bus_coach',           'Coach (long-distance)',                'km', 0.027200, 'DEFRA 2025', 2025),
('transport', 'train_national',      'National rail (UK average)',           'km', 0.035100, 'DEFRA 2025', 2025),
('transport', 'train_london_tube',   'London Underground',                   'km', 0.027700, 'DEFRA 2025', 2025),
('transport', 'train_eurostar',      'Eurostar',                             'km', 0.004200, 'DEFRA 2025', 2025),
('transport', 'tram',                'Tram / light rail',                    'km', 0.028700, 'DEFRA 2025', 2025),
('transport', 'taxi_petrol',         'Taxi - petrol (per km)',               'km', 0.209600, 'DEFRA 2025', 2025),
('transport', 'taxi_electric',       'Taxi - electric (per km)',             'km', 0.057400, 'DEFRA 2025', 2025),
('transport', 'flight_domestic',     'Flight - domestic (economy)',          'km', 0.245600, 'DEFRA 2025', 2025),
('transport', 'flight_short_haul',   'Flight - short-haul economy (<3700km)','km', 0.153700, 'DEFRA 2025', 2025),
('transport', 'flight_long_haul',    'Flight - long-haul economy (>3700km)', 'km', 0.148500, 'DEFRA 2025', 2025),
('transport', 'flight_business',     'Flight - long-haul business class',   'km', 0.429600, 'DEFRA 2025', 2025),
('transport', 'flight_first',        'Flight - first class',                'km', 0.593800, 'DEFRA 2025', 2025),
('transport', 'ferry_passenger',     'Ferry - foot passenger (average)',     'km', 0.018500, 'DEFRA 2025', 2025),
('transport', 'ferry_car',           'Ferry - car (per vehicle km)',         'km', 0.129900, 'DEFRA 2025', 2025),
('transport', 'cycling',             'Cycling (embodied emissions, bike)',   'km', 0.008800, 'DEFRA 2025', 2025),
('transport', 'walking',             'Walking',                              'km', 0.000000, 'DEFRA 2025', 2025),
('transport', 'ebike',               'E-bike',                              'km', 0.011700, 'DEFRA 2025', 2025),

-- ============================================================
-- ENERGY (kg CO2e per unit)
-- ============================================================
('energy', 'electricity_uk',         'Electricity (UK grid average)',        'kWh', 0.207520, 'DEFRA 2025', 2025),
('energy', 'electricity_solar',      'Solar PV (renewable)',                 'kWh', 0.004600, 'DEFRA 2025', 2025),
('energy', 'electricity_wind',       'Wind power (renewable)',               'kWh', 0.007000, 'DEFRA 2025', 2025),
('energy', 'gas_natural',            'Natural gas (per kWh thermal)',        'kWh', 0.182920, 'DEFRA 2025', 2025),
('energy', 'gas_natural_m3',         'Natural gas (per m3)',                 'm3',  2.033400, 'DEFRA 2025', 2025),
('energy', 'gas_lpg_litre',          'LPG (per litre)',                      'litre', 1.549000, 'DEFRA 2025', 2025),
('energy', 'oil_heating',            'Heating oil (per litre)',              'litre', 2.519600, 'DEFRA 2025', 2025),
('energy', 'coal',                   'Coal (per tonne)',                     'tonne', 2352.000000, 'DEFRA 2025', 2025),
('energy', 'wood_pellets',           'Wood pellets (per tonne)',             'tonne', 72.600000, 'DEFRA 2025', 2025),
('energy', 'district_heat',          'District heating (average UK)',        'kWh', 0.136000, 'DEFRA 2025', 2025),
('energy', 'biomass',                'Biomass (wood chip, per kWh)',         'kWh', 0.028900, 'DEFRA 2025', 2025);
