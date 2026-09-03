"""Chicama conditions by month, ERA5 + wave reanalysis, valid days only.

Adds the question that actually decides a booking: if you pick a random 7-day
window in a given month, how likely is it to contain 3+ good days?
"""
import json, urllib.request
from collections import defaultdict
from statistics import mean

LAT, LON = -7.84, -79.44
START, END = "2021-01-01", "2025-12-31"   # wave archive has no coverage before 2021

def get(url):
    with urllib.request.urlopen(url, timeout=180) as r:
        return json.load(r)

marine = get(
    f"https://marine-api.open-meteo.com/v1/marine?latitude={LAT}&longitude={LON}"
    f"&start_date={START}&end_date={END}"
    "&daily=swell_wave_height_max,swell_wave_period_max,swell_wave_direction_dominant"
    "&timezone=America%2FLima")
weather = get(
    f"https://archive-api.open-meteo.com/v1/archive?latitude={LAT}&longitude={LON}"
    f"&start_date={START}&end_date={END}"
    "&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,"
    "wind_direction_10m_dominant&timezone=America%2FLima")
sst_raw = get(
    f"https://marine-api.open-meteo.com/v1/marine?latitude={LAT}&longitude={LON}"
    f"&start_date=2022-01-01&end_date={END}&hourly=sea_surface_temperature"
    "&timezone=America%2FLima")

sst_daily = defaultdict(list)
for t, v in zip(sst_raw["hourly"]["time"], sst_raw["hourly"]["sea_surface_temperature"]):
    if v is not None:
        sst_daily[t[:10]].append(v)

IDEAL_DIR, OFFSHORE_DIR, OFFSHORE_TOL = (190, 235), 150, 65

def angle_delta(a, b):
    d = abs(a - b) % 360
    return 360 - d if d > 180 else d

def score_swell(h, p, d, wk, wd):
    period = max(0.0, min(1.0, (p - 8) / 8)) * 40
    size = max(0.0, 1 - abs(h - 1.6) / 1.6) * 25
    lo, hi = IDEAL_DIR
    off = lo - d if d < lo else (d - hi if d > hi else 0)
    direction = max(0.0, 1 - off / 60) * 20
    offshoreness = max(0.0, 1 - angle_delta(wd, OFFSHORE_DIR) / (OFFSHORE_TOL * 2))
    calm = max(0.0, 1 - wk / 35)
    return round(period + size + direction + wind_pts(offshoreness, calm))

def wind_pts(offshoreness, calm):
    return (offshoreness * 0.6 + calm * 0.4) * 15

md, wdy = marine["daily"], weather["daily"]
widx = {t: i for i, t in enumerate(wdy["time"])}

rows = []
for i, day in enumerate(md["time"]):
    j = widx.get(day)
    h, p, d = md["swell_wave_height_max"][i], md["swell_wave_period_max"][i], md["swell_wave_direction_dominant"][i]
    if j is None or None in (h, p, d):
        continue
    wk, wd = wdy["wind_speed_10m_max"][j], wdy["wind_direction_10m_dominant"][j]
    if None in (wk, wd):
        continue
    s = sst_daily.get(day)
    rows.append(dict(day=day, month=int(day[5:7]), year=int(day[:4]),
                     h=h, p=p, d=d, wind=wk, wdir=wd,
                     sst=mean(s) if s else None,
                     tmax=wdy["temperature_2m_max"][j], tmin=wdy["temperature_2m_min"][j],
                     rain=wdy["precipitation_sum"][j] or 0,
                     score=score_swell(h, p, d, wk, wd)))

MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"]
by_month = defaultdict(list)
for r in rows:
    by_month[r["month"]].append(r)

def pct(vals, test):
    vals = [v for v in vals if v is not None]
    return 100 * sum(1 for v in vals if test(v)) / len(vals) if vals else 0.0

print(f"Chicama ({LAT}, {LON}) — {len(rows)} valid days, {rows[0]['day']} to {rows[-1]['day']}\n")
hdr = "Mon  Swell   Period  >=13s   Dir    Good+  Firing   SST     Air        Wind    Rain/mo"
print(hdr); print("-" * len(hdr))
summary = {}
for m in range(1, 13):
    r = by_month[m]
    v = dict(
        h=mean(x["h"] for x in r), p=mean(x["p"] for x in r), d=mean(x["d"] for x in r),
        p13=pct([x["p"] for x in r], lambda z: z >= 13),
        good=pct([x["score"] for x in r], lambda z: z >= 58),
        fire=pct([x["score"] for x in r], lambda z: z >= 75),
        sst=mean([x["sst"] for x in r if x["sst"] is not None]) if any(x["sst"] for x in r) else None,
        tmax=mean(x["tmax"] for x in r), tmin=mean(x["tmin"] for x in r),
        wind=mean(x["wind"] for x in r),
        rain=sum(x["rain"] for x in r) / len(set(x["year"] for x in r)),
    )
    summary[MONTHS[m-1]] = v
    print(f"{MONTHS[m-1]}  {v['h']*3.28084:4.1f}ft  {v['p']:5.1f}s  {v['p13']:4.0f}%  "
          f"{v['d']:3.0f}°  {v['good']:5.0f}%  {v['fire']:5.0f}%  "
          f"{(v['sst'] or 0):4.1f}C  {v['tmax']:4.1f}/{v['tmin']:4.1f}C  "
          f"{v['wind']:4.1f}kmh  {v['rain']:5.1f}mm")

# The booking question: pick a random 7-day window starting in this month.
print("\n--- if you book a random 7-day window, what do you get? ---")
print("Mon   P(3+ good days)   P(5+ good)   median good days per week   best run seen")
by_day = {r["day"]: r for r in rows}
dates = sorted(by_day)
for m in range(1, 13):
    counts = []
    for i, day in enumerate(dates[:-6]):
        if int(day[5:7]) != m:
            continue
        window = dates[i:i+7]
        # only score contiguous weeks
        counts.append(sum(1 for d in window if by_day[d]["score"] >= 58))
    if not counts:
        continue
    counts.sort()
    p3 = 100 * sum(1 for c in counts if c >= 3) / len(counts)
    p5 = 100 * sum(1 for c in counts if c >= 5) / len(counts)
    print(f"{MONTHS[m-1]}  {p3:12.0f}%  {p5:10.0f}%  {counts[len(counts)//2]:20d}  {max(counts):13d}")

print("\n--- Oct 1 to Dec 15 in ten-day blocks (the window in question) ---")
print("Block            Good+   Firing   Mean period   Mean swell   SST")
blocks = [("Oct 1-10",10,1,10),("Oct 11-20",10,11,20),("Oct 21-31",10,21,31),
          ("Nov 1-10",11,1,10),("Nov 11-20",11,11,20),("Nov 21-30",11,21,30),
          ("Dec 1-10",12,1,10),("Dec 11-15",12,11,15)]
for label, m, a, b in blocks:
    sel = [x for x in rows if x["month"] == m and a <= int(x["day"][8:10]) <= b]
    ssts = [x["sst"] for x in sel if x["sst"] is not None]
    print(f"{label:14s}  {pct([x['score'] for x in sel], lambda z: z>=58):5.0f}%  "
          f"{pct([x['score'] for x in sel], lambda z: z>=75):5.0f}%  "
          f"{mean(x['p'] for x in sel):9.1f}s  {mean(x['h'] for x in sel)*3.28084:9.1f}ft  "
          f"{(mean(ssts) if ssts else float('nan')):5.1f}C")

with open("chicama_summary.json", "w") as f:
    json.dump(summary, f, indent=2)
print("\nwrote chicama_summary.json")
