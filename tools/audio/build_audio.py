#!/usr/bin/env python3
"""Builds public/assets/audio/ from the owner-approved audio packs and updates CREDITS.md.

Run from the repo root:  python3 tools/audio/build_audio.py <folder with the downloaded zips>

The packs are not committed (like legacy/ art). Download each zip from its page below into one
folder; this script checks every zip against its recorded SHA-256 before using it, reads only
the files named here (never running anything from the packs), and with ffmpeg (a dev-machine
tool; nothing new ships in the game) writes for every sound:
  - <key>.ogg (Ogg Vorbis), and
  - <key>.m4a (AAC), for iPhone Safari.
Sound effects are made mono to stay inside the 3 MB audio budget (PROJECT.md).
Sources approved by the owner on 2026-10-19 (the same Kenney packs as Contro; the music was
chosen by the owner from three ansimuz candidates).
"""
import hashlib
import pathlib
import shutil
import subprocess
import sys
import tempfile
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent.parent.parent
OUT = ROOT / "public" / "assets" / "audio"
CREDITS = ROOT / "CREDITS.md"
START, END = "<!-- audio:start -->", "<!-- audio:end -->"

# zip name → (page, author, licence, SHA-256 of the zip as downloaded 2026-10-19)
PACKS = {
    "sci-fi_sounds.zip": ("https://opengameart.org/content/sci-fi-sounds", "Kenney", "CC0",
                          "119340f351a5098ad814f78719438c0da355a9ce8a4c8a3af6a8d48aa3d49e04"),
    "Digital_SFX_Set.zip": ("https://opengameart.org/content/63-digital-sound-effects-lasers-phasers-space-etc",
                            "Kenney", "CC0",
                            "022f0f4b73da55989567fe2b373c8af89d74f5d015257e293cab497ca606d063"),
    "dark-happy-world.zip": ("https://opengameart.org/content/dark-happy-world", "ansimuz (Luis Zuno)",
                             "CC0", "c8f34eadc1f8beda5d1724f901ae7715daa158a67a33ae271cd5634bc50e151b"),
}

# key → (zip, file inside it, kind). Keys match SOUNDS in src/config/audio.ts.
SOUNDS = {
    "sfx-rotor": ("sci-fi_sounds.zip", "Audio/engineCircular_000.ogg", "loop"),
    "sfx-gun": ("sci-fi_sounds.zip", "Audio/laserSmall_002.ogg", "sfx"),
    "sfx-bomb-drop": ("Digital_SFX_Set.zip", "phaserDown2.mp3", "sfx"),
    "sfx-blast": ("sci-fi_sounds.zip", "Audio/explosionCrunch_002.ogg", "sfx"),
    "sfx-crash": ("sci-fi_sounds.zip", "Audio/lowFrequency_explosion_000.ogg", "sfx"),
    "sfx-flak": ("sci-fi_sounds.zip", "Audio/laserLarge_003.ogg", "sfx"),
    "sfx-heli-hit": ("sci-fi_sounds.zip", "Audio/impactMetal_000.ogg", "sfx"),
    "sfx-soldier-shot": ("sci-fi_sounds.zip", "Audio/laserRetro_000.ogg", "sfx"),
    "sfx-spark": ("sci-fi_sounds.zip", "Audio/impactMetal_004.ogg", "sfx"),
    "sfx-land": ("sci-fi_sounds.zip", "Audio/impactMetal_001.ogg", "sfx"),
    "sfx-hard-land": ("sci-fi_sounds.zip", "Audio/impactMetal_003.ogg", "sfx"),
    "sfx-board": ("Digital_SFX_Set.zip", "pepSound1.mp3", "sfx"),
    "sfx-saved": ("Digital_SFX_Set.zip", "powerUp2.mp3", "sfx"),
    "sfx-lost": ("Digital_SFX_Set.zip", "lowDown.mp3", "sfx"),
    "sfx-complete": ("Digital_SFX_Set.zip", "powerUp12.mp3", "sfx"),
    "sfx-game-over": ("Digital_SFX_Set.zip", "zapThreeToneDown.mp3", "sfx"),
    "sfx-select": ("Digital_SFX_Set.zip", "twoTone1.mp3", "sfx"),
    "music": ("dark-happy-world.zip", "dark-happy-world/dark-happy-world.ogg", "music"),
}

# ffmpeg settings per kind: channels, Vorbis quality, AAC bitrate.
ENCODE = {
    "sfx": ("1", "2", "64k"),
    "loop": ("1", "2", "64k"),
    "music": ("2", "1", "64k"),
}


def sha256(path: pathlib.Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def encode(src: pathlib.Path, dst: pathlib.Path, kind: str) -> None:
    channels, quality, bitrate = ENCODE[kind]
    codec = ["-c:a", "libvorbis", "-q:a", quality] if dst.suffix == ".ogg" else ["-c:a", "aac", "-b:a", bitrate]
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vn", "-map_metadata", "-1", "-ac", channels, *codec, str(dst)]
    subprocess.run(cmd, check=True)


def credits_table() -> str:
    rows = ["| File | Source | Changes |", "|---|---|---|"]
    for key, (zip_name, inner, kind) in SOUNDS.items():
        page, author, licence, _ = PACKS[zip_name]
        mono = "mono, " if ENCODE[kind][0] == "1" else ""
        for ext, what in (("ogg", "re-encoded to Ogg Vorbis"), ("m4a", "AAC (M4A) copy for iPhone Safari")):
            rows.append(f"| `assets/audio/{key}.{ext}` | [{zip_name}]({page}) `{inner}` by {author}, {licence} | {mono}{what} |")
    return "\n".join(rows)


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    if shutil.which("ffmpeg") is None:
        print("ffmpeg is needed (dev machine only)")
        return 2
    packs = pathlib.Path(sys.argv[1])
    for zip_name, (_, _, _, digest) in PACKS.items():
        got = sha256(packs / zip_name)
        if got != digest:
            print(f"{zip_name}: SHA-256 {got} does not match the recorded {digest}; not using it")
            return 1
    OUT.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for key, (zip_name, inner, kind) in SOUNDS.items():
            with zipfile.ZipFile(packs / zip_name) as z:
                data = z.read(inner)  # only this named file; nothing in the pack is run
            src = pathlib.Path(tmp) / (key + pathlib.PurePosixPath(inner).suffix)
            src.write_bytes(data)
            for ext in ("ogg", "m4a"):
                encode(src, OUT / f"{key}.{ext}", kind)
    text = CREDITS.read_text()
    table = f"{START}\n{credits_table()}\n{END}"
    if START in text:
        before, rest = text.split(START, 1)
        after = rest.split(END, 1)[1]
        text = before + table + after
    else:
        text = text.rstrip("\n") + "\n\n## Audio\n\nSound effects and music from CC0 packs, each approved by the owner (2026-10-19). Built by `tools/audio/build_audio.py`, which checks each downloaded pack against the SHA-256 recorded in it; only the files below are copied.\n\n" + table + "\n"
    CREDITS.write_text(text)
    total = sum(p.stat().st_size for p in OUT.iterdir())
    print(f"wrote {len(SOUNDS) * 2} files, {total / 1e6:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
