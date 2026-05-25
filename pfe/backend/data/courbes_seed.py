"""
SNCFT — Courbes de la région de Gafsa
Real data source: inspection reports, Arrondissements de Métlaoui et de Gafsa.

Line 21 (Gafsa–Aouinet): REAL data from SNCFT Excel report.
Line 13-GAF (Menzel Bouzayen–Métlaoui): REAL data from SNCFT inspection report.
Lines 13-MET, 15-MET, 16-MET, 14-GAF: realistic synthetic data
matching the known characteristics of each line. Replace each section with
real data as Excel sheets become available.

Compact raw format per curve:
  (pk_debut, pk_fin, developpement_m, rayon_m, devers_mm_or_None, gare_proche)
"""
from datetime import datetime


# ── Risk classifier ────────────────────────────────────────────────────────────

def _risque(rayon: int) -> tuple[str, str]:
    """Returns (statut, niveau_risque) from curve radius in metres."""
    if rayon >= 1000:
        return "OK",     "FAIBLE"
    if rayon >= 500:
        return "OK",     "MOYEN"
    if rayon >= 300:
        return "ALERTE", "ELEVE"
    return     "ALERTE", "CRITIQUE"


def _build(ligne, nom_ligne, arrondissement, raw_rows) -> list[dict]:
    arr_code = arrondissement[:3].upper()
    result = []
    for i, (pk_d, pk_f, dev, rayon, devers, gare) in enumerate(raw_rows, start=1):
        statut, niveau = _risque(rayon)
        result.append({
            "segment_id":       f"L{ligne}-{arr_code}-{i:03d}",
            "ligne":            ligne,
            "nom_ligne":        nom_ligne,
            "arrondissement":   arrondissement,
            "pk_debut":         pk_d.replace(" ", ""),
            "pk_fin":           pk_f.replace(" ", ""),
            "developpement_m":  dev,
            "rayon_m":          rayon,
            "devers_mm":        devers,
            "gare_proche":      gare,
            "statut":           statut,
            "niveau_risque":    niveau,
            # Legacy fields kept for curvature_agent compatibility
            "segment":          f"L{ligne}-{arr_code}-{i:03d}",
            "name":             f"{nom_ligne} ({pk_d}–{pk_f})",
            "rayon_courbure":   rayon,
            "degres_par_km":    round(1746 / rayon, 2) if rayon else 0,
            "etat":             statut,
            "date_maj":         "2025-04-01",
            "longueur_km":      round(dev / 1000, 3),
            "date_mise_a_jour": datetime(2025, 4, 1),
        })
    return result


# ══════════════════════════════════════════════════════════════════════════════
# ARRONDISSEMENT DE MÉTLAOUI
# ══════════════════════════════════════════════════════════════════════════════

# ── Ligne 13 : Métlaoui – Tozeur (~70 courbes) — SYNTHETIC ────────────────────
# Replace this section with real data when the Métlaoui sheet is available.
_L13_MET_RAW = [
    # Section Métlaoui (near station, mountainous terrain)
    ("207+210", "207+690",  480,  400, 90, "Métlaoui"),
    ("207+850", "208+320",  470,  350,105, "Métlaoui"),
    ("208+500", "208+980",  480,  600, 75, "Métlaoui"),
    ("209+120", "209+620",  500,  450, 90, "Métlaoui"),
    ("209+800", "210+350",  550,  800, 55, "Métlaoui"),
    ("210+550", "211+100",  550, 1000, 40, "Métlaoui"),
    ("211+280", "211+820",  540,  500, 75, "Métlaoui"),
    ("212+050", "212+690",  640,  700, 60, "El Aouam"),
    ("212+900", "213+480",  580,  600, 70, "El Aouam"),
    ("213+700", "214+220",  520,  900, 45, "El Aouam"),
    ("214+450", "215+050",  600, 1200, 35, "El Aouam"),
    ("215+200", "215+900",  700,  800, 50, "El Aouam"),
    ("216+100", "216+700",  600, 1000, 40, "El Aouam"),
    ("217+000", "217+600",  600, 1500, 28, "El Aouam"),
    ("217+900", "218+300",  400, 2000, 20, "El Aouam"),
    # Section Chott el-Gharsa (flat salt plain, large radii)
    ("218+700", "219+550",  850, 2000, 20, "El Aouam"),
    ("220+000", "221+000", 1000, 2500, 18, "El Aouam"),
    ("221+500", "222+500", 1000, 3000, 15, "El Aouam"),
    ("223+000", "223+800",  800, 2000, 20, "El Aouam"),
    ("224+500", "225+500", 1000, 2500, 18, "El Aouam"),
    ("226+200", "227+200", 1000, 3000, 15, "El Aouam"),
    ("228+000", "229+000", 1000, 2000, 20, "El Aouam"),
    ("230+000", "231+000", 1000, 2500, 18, "El Aouam"),
    ("232+000", "233+100", 1100, 3000, 15, "El Aouam"),
    ("234+200", "235+000",  800, 2000, 20, "El Aouam"),
    ("235+600", "236+600", 1000, 2500, 18, "Hazoua"),
    ("237+200", "238+200", 1000, 1800, 22, "Hazoua"),
    ("239+100", "240+100", 1000, 2000, 20, "Hazoua"),
    ("241+000", "242+000", 1000, 2500, 18, "Hazoua"),
    ("242+700", "243+700", 1000, 2000, 20, "Hazoua"),
    ("244+200", "245+000",  800, 1500, 28, "Hazoua"),
    ("245+400", "246+100",  700, 2000, 20, "Hazoua"),
    ("246+500", "247+200",  700, 1500, 28, "Hazoua"),
    ("247+700", "248+200",  500, 2000, 20, "Hazoua"),
    ("248+700", "249+200",  500, 1200, 35, "Hazoua"),
    ("249+700", "250+200",  500, 1000, 40, "Hazoua"),
    ("251+200", "252+000",  800, 1500, 28, "Hazoua"),
    # Section Nefta–Tozeur (approach, undulating terrain)
    ("252+800", "253+400",  600, 1200, 35, "Nefta"),
    ("253+800", "254+400",  600, 1000, 40, "Nefta"),
    ("254+700", "255+300",  600,  800, 50, "Nefta"),
    ("255+600", "256+200",  600,  700, 60, "Nefta"),
    ("256+500", "257+200",  700, 1000, 40, "Nefta"),
    ("257+500", "258+100",  600, 1200, 35, "Nefta"),
    ("258+400", "258+900",  500, 1500, 28, "Nefta"),
    ("259+200", "259+900",  700,  800, 50, "Nefta"),
    ("260+200", "260+900",  700,  600, 70, "Nefta"),
    ("261+200", "261+800",  600,  500, 75, "Nefta"),
    ("262+000", "262+700",  700,  700, 60, "Tozeur"),
    ("263+000", "263+600",  600,  900, 45, "Tozeur"),
    ("263+900", "264+400",  500, 1000, 40, "Tozeur"),
    # Additional curves to reach ~70
    ("208+150", "208+490",  340,  270,115, "Métlaoui"),
    ("210+000", "210+400",  400,  480, 88, "Métlaoui"),
    ("211+900", "212+040",  140, 1800, 22, "El Aouam"),
    ("215+050", "215+190",  140, 1600, 25, "El Aouam"),
    ("218+100", "218+500",  400, 1000, 40, "El Aouam"),
    ("219+600", "220+000",  400, 1800, 22, "El Aouam"),
    ("222+600", "223+000",  400, 2000, 20, "El Aouam"),
    ("225+600", "226+100",  500, 1500, 28, "El Aouam"),
    ("227+300", "227+900",  600, 2000, 20, "El Aouam"),
    ("229+100", "229+700",  600, 1800, 22, "El Aouam"),
    ("231+100", "231+700",  600, 2500, 18, "El Aouam"),
    ("233+200", "234+000",  800, 1800, 22, "El Aouam"),
    ("236+700", "237+100",  400, 1200, 35, "Hazoua"),
    ("240+200", "240+600",  400, 1000, 40, "Hazoua"),
    ("243+800", "244+100"),
    ("250+300", "250+700",  400, 1800, 22, "Hazoua"),
    ("252+100", "252+700",  600, 1000, 40, "Hazoua"),
    ("256+300", "256+480",  180, 2000, 20, "Nefta"),
    ("259+000", "259+190",  190, 1200, 35, "Nefta"),
    ("261+900", "261+990"),
]

# Remove malformed placeholder entries (tuples with wrong arity)
_L13_MET_RAW = [r for r in _L13_MET_RAW if len(r) == 6]


# ── Ligne 15 : Métlaoui – Henchir Souatir (~50 courbes) — SYNTHETIC ───────────
_L15_MET_RAW = [
    ("207+300", "207+780",  480,  350,105, "Métlaoui"),
    ("207+950", "208+450",  500,  280,115, "Métlaoui"),
    ("208+620", "209+100",  480,  400, 90, "Métlaoui"),
    ("209+280", "209+760",  480,  500, 78, "Métlaoui"),
    ("209+950", "210+480",  530,  350,105, "Métlaoui"),
    ("210+650", "211+180",  530,  600, 73, "Métlaoui"),
    ("211+350", "211+870",  520,  250,120, "Om Larayes"),
    ("212+050", "212+600",  550,  300,110, "Om Larayes"),
    ("212+780", "213+350",  570,  450, 90, "Om Larayes"),
    ("213+530", "214+080",  550,  550, 75, "Om Larayes"),
    ("214+260", "214+810",  550,  400, 90, "Om Larayes"),
    ("215+000", "215+550",  550,  350,105, "Om Larayes"),
    ("215+730", "216+280",  550,  280,115, "Om Larayes"),
    ("216+460", "217+010",  550,  400, 90, "Om Larayes"),
    ("217+200", "217+750",  550,  500, 78, "Om Larayes"),
    ("217+940", "218+400",  460,  600, 73, "Om Larayes"),
    ("218+600", "219+100",  500,  350,105, "Om Larayes"),
    ("219+280", "219+780",  500,  300,110, "Om Larayes"),
    ("219+960", "220+510",  550,  450, 90, "Om Larayes"),
    ("220+700", "221+260",  560,  380,100, "Om Larayes"),
    ("221+450", "221+990",  540,  280,115, "Om Larayes"),
    ("222+180", "222+720",  540,  400, 90, "Om Larayes"),
    ("222+910", "223+470",  560,  500, 78, "Om Larayes"),
    ("223+660", "224+210",  550,  350,105, "Om Larayes"),
    ("224+400", "224+930",  530,  250,120, "Om Larayes"),
    ("225+120", "225+650",  530,  300,110, "Henchir Souatir"),
    ("225+840", "226+380",  540,  450, 90, "Henchir Souatir"),
    ("226+570", "227+110",  540,  550, 75, "Henchir Souatir"),
    ("227+300", "227+820",  520,  350,105, "Henchir Souatir"),
    ("228+010", "228+550",  540,  400, 90, "Henchir Souatir"),
    ("228+740", "229+260",  520,  280,115, "Henchir Souatir"),
    ("229+450", "230+000",  550,  220,130, "Henchir Souatir"),
    ("230+200", "230+740",  540,  300,110, "Henchir Souatir"),
    ("230+930", "231+470",  540,  380,100, "Henchir Souatir"),
    ("231+660", "232+200",  540,  500, 78, "Henchir Souatir"),
    ("232+390", "232+920",  530,  350,105, "Henchir Souatir"),
    ("233+110", "233+640",  530,  280,115, "Henchir Souatir"),
    ("233+830", "234+370",  540,  400, 90, "Henchir Souatir"),
    ("234+560", "235+090",  530,  450, 90, "Henchir Souatir"),
    ("235+280", "235+810",  530,  300,110, "Henchir Souatir"),
    ("236+000", "236+540",  540,  350,105, "Henchir Souatir"),
    ("236+730", "237+260",  530,  250,120, "Henchir Souatir"),
    ("237+450", "237+980",  530,  400, 90, "Henchir Souatir"),
    ("238+170", "238+690",  520,  500, 78, "Henchir Souatir"),
    ("208+450", "208+610",  160,  220,130, "Métlaoui"),
    ("211+180", "211+340",  160,  190,140, "Om Larayes"),
    ("215+550", "215+720",  170,  250,120, "Om Larayes"),
    ("221+260", "221+440",  180,  210,135, "Om Larayes"),
    ("232+200", "232+380",  180,  200,138, "Henchir Souatir"),
    ("236+540", "236+720",  180,  240,122, "Henchir Souatir"),
]


# ── Ligne 16 : Tabeddit – Redeyef (~27 courbes) — SYNTHETIC ───────────────────
_L16_MET_RAW = [
    ("183+150", "183+620",  470,  280,115, "Tabeddit"),
    ("183+810", "184+290",  480,  350,105, "Tabeddit"),
    ("184+480", "184+930",  450,  250,120, "Tabeddit"),
    ("185+120", "185+600",  480,  400, 90, "Tabeddit"),
    ("185+790", "186+270",  480,  300,110, "Tabeddit"),
    ("186+460", "186+930",  470,  220,130, "Tabeddit"),
    ("187+120", "187+600",  480,  350,105, "Tabeddit"),
    ("187+790", "188+250",  460,  280,115, "Tabeddit"),
    ("188+440", "188+910",  470,  450, 90, "Tabeddit"),
    ("189+100", "189+570",  470,  500, 78, "Tabeddit"),
    ("189+760", "190+230",  470,  350,105, "Tabeddit"),
    ("190+420", "190+890",  470,  280,115, "Redeyef"),
    ("191+080", "191+550",  470,  200,138, "Redeyef"),
    ("191+740", "192+220",  480,  250,120, "Redeyef"),
    ("192+410", "192+870",  460,  300,110, "Redeyef"),
    ("193+060", "193+530",  470,  180,148, "Redeyef"),
    ("193+720", "194+190",  470,  220,130, "Redeyef"),
    ("194+380", "194+840",  460,  350,105, "Redeyef"),
    ("195+030", "195+500",  470,  280,115, "Redeyef"),
    ("195+690", "196+160",  470,  400, 90, "Redeyef"),
    ("196+350", "196+810",  460,  250,120, "Redeyef"),
    ("197+000", "197+470",  470,  300,110, "Redeyef"),
    ("197+660", "198+130",  470,  220,130, "Redeyef"),
    ("198+320", "198+790",  470,  200,138, "Redeyef"),
    ("198+980", "199+440",  460,  350,105, "Redeyef"),
    ("199+630", "200+090",  460,  280,115, "Redeyef"),
    ("200+280", "200+730",  450,  240,122, "Redeyef"),
]


# ══════════════════════════════════════════════════════════════════════════════
# ARRONDISSEMENT DE GAFSA
# ══════════════════════════════════════════════════════════════════════════════

# ── Ligne 13 : Menzel Bouzayen – Métlaoui (31 courbes) ★ DONNÉES RÉELLES ───────
_L13_GAF_RAW = [
    # * Gare de Menzel Bouzayen
    ("140+584", "140+767",  183,   750, None, "Menzel Bouzayen"),
    ("144+393", "144+714",  321,   900, None, "Menzel Bouzayen"),
    ("145+542", "145+974",  432,   600, None, "Menzel Bouzayen"),
    ("146+205", "146+613",  408,   500, None, "Menzel Bouzayen"),
    ("146+806", "147+114",  308,   500, None, "Menzel Bouzayen"),
    ("148+561", "149+332",  367,  1800, None, "Menzel Bouzayen"),
    ("148+561", "149+332",  404,  1800, None, "Menzel Bouzayen"),
    ("149+469", "149+655",  186,   400, None, "Menzel Bouzayen"),
    ("149+814", "150+091",  277,   450, None, "Menzel Bouzayen"),
    ("150+243", "150+809",  566,   500, None, "Menzel Bouzayen"),
    ("151+265", "151+489",  224,   500, None, "Menzel Bouzayen"),
    ("151+644", "151+803",  159,   400, None, "Menzel Bouzayen"),
    ("152+087", "152+829",  742,  1000, None, "Menzel Bouzayen"),
    # * Gare de Sened
    ("153+254", "153+942",  688,  1000, None, "Sened"),
    ("154+492", "154+967",  475,  1000, None, "Sened"),
    ("157+737", "158+139",  402,  2000, None, "Sened"),
    ("158+478", "158+980",  502,  2000, None, "Sened"),
    ("161+657", "162+175",  518,   800, None, "Sened"),
    ("162+702", "162+894",  192,   500, None, "Sened"),
    ("166+604", "166+924",  320,   500, None, "Sened"),
    ("167+125", "167+436",  311,   500, None, "Sened"),
    # * Gare de Zannouch
    ("169+479", "169+854",  375,  1000, None, "Zannouch"),
    ("170+120", "170+557",  437,  1000, None, "Zannouch"),
    ("172+519", "173+062",  543,  2000, None, "Zannouch"),
    ("180+085", "180+486",  401,  1000, None, "Zannouch"),
    ("180+913", "181+512",  599,  2000, None, "Zannouch"),
    ("182+890", "183+448",  558,  3000, None, "Zannouch"),
    ("185+039", "185+469",  430,  2000, None, "Zannouch"),
    ("191+133", "191+713",  580,   500, None, "Zannouch"),
    ("191+914", "192+112",  198,   500, None, "Zannouch"),
    ("192+385", "192+890",  505,   500, None, "Zannouch"),
]


# ── Ligne 14 : Aguila – Sehib (M'dhilla) (~14 courbes) — SYNTHETIC ────────────
_L14_GAF_RAW = [
    ("140+250", "140+820",  570,  500, 78, "Aguila"),
    ("141+020", "141+590",  570,  700, 60, "Aguila"),
    ("141+790", "142+360",  570,  400, 90, "Aguila"),
    ("142+560", "143+120",  560,  800, 55, "Aguila"),
    ("143+320", "143+870",  550,  600, 73, "Aguila"),
    ("144+070", "144+620",  550, 1000, 40, "M'dhilla"),
    ("144+820", "145+370",  550,  500, 78, "M'dhilla"),
    ("145+570", "146+110",  540,  350,105, "M'dhilla"),
    ("146+310", "146+850",  540,  700, 60, "M'dhilla"),
    ("147+050", "147+590",  540,  900, 45, "M'dhilla"),
    ("147+790", "148+320",  530,  400, 90, "M'dhilla"),
    ("148+520", "149+050",  530,  600, 73, "M'dhilla"),
    ("149+250", "149+770",  520,  800, 55, "M'dhilla"),
    ("149+970", "150+470",  500, 1000, 40, "M'dhilla"),
]


# ══════════════════════════════════════════════════════════════════════════════
# LIGNE 21 : Gafsa – Aouinet  ★ DONNÉES RÉELLES (rapport SNCFT)
# ══════════════════════════════════════════════════════════════════════════════
_L21_GAF_RAW = [
    # pk_debut       pk_fin      dev   rayon  devers  gare
    ("03+596",  "04+013",  417,   600,   65,  "Gafsa"),
    ("04+295",  "04+580",  285,   500,   75,  "Gafsa"),
    ("05+235",  "05+480",  244,  1500,   25,  "Gafsa"),
    ("05+741",  "06+005",  264,  1000,   40,  "Gafsa"),
    ("08+031",  "08+264",  232,  2000,   20,  "Gafsa"),
    ("09+902",  "10+656",  754,  1500,   25,  "Gafsa"),
    ("13+383",  "13+726",  342,  1000,   40,  "Gafsa"),
    ("14+000",  "14+405",  405,   800,   50,  "Gafsa"),
    # * Gare El Guettar
    ("17+742",  "18+603",  860,  1000,   40,  "El Guettar"),
    ("20+930",  "21+726",  795,  1000,   40,  "El Guettar"),
    ("21+935",  "22+503",  567,   556,   70,  "El Guettar"),
    ("22+503",  "23+123",  620,   707,   55,  "El Guettar"),
    ("24+558",  "25+475",  917,  2000,   20,  "El Guettar"),
    ("27+383",  "27+684",  301,  2000,   20,  "El Guettar"),
    # * Gare MG1
    ("33+588",  "34+329",  741,  1950,   20,  "MG1"),
    ("34+500",  "34+694",  194,   960,   40,  "MG1"),
    ("34+694",  "34+877",  182,   700,   55,  "MG1"),
    ("34+877",  "35+136",  258,   866,   45,  "MG1"),
    ("35+416",  "35+969",  252,  1000,   40,  "MG1"),  # note: 553m gap before = 553m dev
    ("36+830",  "37+844", 1014,  1800,   20,  "MG1"),
    ("39+510",  "39+981",  471,  2000,   20,  "MG1"),
    ("42+200",  "42+829",  628,  1500,   25,  "MG1"),
    ("43+320",  "43+716",  396,  1000,   40,  "MG1"),
    ("47+070",  "47+703",  532,  2000,   20,  "MG1"),
    ("51+519",  "51+769",  250,  2000,   20,  "MG1"),
]


# ══════════════════════════════════════════════════════════════════════════════
# BUILD FINAL DATASET
# ══════════════════════════════════════════════════════════════════════════════

COURBES_DATA: list[dict] = (
    _build("13", "Métlaoui – Tozeur",              "METLAOUI", _L13_MET_RAW) +
    _build("15", "Métlaoui – Henchir Souatir",     "METLAOUI", _L15_MET_RAW) +
    _build("16", "Tabeddit – Redeyef",             "METLAOUI", _L16_MET_RAW) +
    _build("13", "Menzel Bouzayen – Métlaoui",     "GAFSA",    _L13_GAF_RAW) +
    _build("14", "Aguila – Sehib (M'dhilla)",      "GAFSA",    _L14_GAF_RAW) +
    _build("21", "Gafsa – Aouinet",                "GAFSA",    _L21_GAF_RAW)
)


# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY (printed at import time for visibility)
# ══════════════════════════════════════════════════════════════════════════════

def _print_summary():
    from collections import Counter
    lines    = Counter(c["nom_ligne"] for c in COURBES_DATA)
    alerte   = [c for c in COURBES_DATA if c["statut"] == "ALERTE"]
    critique = [c for c in COURBES_DATA if c["niveau_risque"] == "CRITIQUE"]
    sep = "-" * 64
    print(f"\n{sep}")
    print("  SNCFT -- Courbes chargees")
    print(sep)
    for nom, count in sorted(lines.items()):
        print(f"  {nom:<42} {count:>3} courbes")
    print(sep)
    print(f"  Total courbes    : {len(COURBES_DATA)}")
    print(f"  ALERTE (>=ELEVE) : {len(alerte)}")
    print(f"  CRITIQUE (<300m) : {len(critique)}")
    print(sep)
    top5 = sorted(COURBES_DATA, key=lambda c: c["rayon_m"])[:5]
    print("  Top 5 courbes les plus dangereuses (rayon minimal) :")
    for c in top5:
        print(f"    {c['segment_id']:<14} {c['nom_ligne']:<30} R={c['rayon_m']}m")
    print(f"{sep}\n")


_print_summary()
