#!/usr/bin/env python3
"""Download only the public assets needed to reproduce the Datacurve analysis."""

from __future__ import annotations

import json
import mimetypes
import re
import subprocess
from collections import defaultdict
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlparse

TOOL_DIR = Path(__file__).resolve().parent
RESEARCH_DIR = TOOL_DIR.parent
RAW_PUBLIC_DIR = RESEARCH_DIR / "raw" / "public"
TARGET = "https://datacurve.ai/"


def asset_key(url: str) -> str:
    """Collapse only known cache-busting variants of the same logical asset."""
    parsed = urlparse(url)
    if parsed.netloc == "datacurve.ai" and parsed.path == "/gifs/depth-scenes.json":
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    return url


class AssetParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.assets: list[dict] = []

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        values = dict(attrs)
        attribute = "src" if tag in {"script", "img", "source"} else "href"
        value = values.get(attribute)
        if value and tag in {"script", "img", "source", "link"}:
            self.assets.append(
                {
                    "url": urljoin(TARGET, value),
                    "tag": tag,
                    "attribute": attribute,
                    "rel": values.get("rel"),
                    "as": values.get("as"),
                    "declaredType": values.get("type"),
                }
            )
        if tag not in {"img", "source"} or not values.get("srcset"):
            return
        for candidate in values["srcset"].split(","):
            candidate_url, _, descriptor = candidate.strip().partition(" ")
            if candidate_url:
                self.assets.append(
                    {
                        "url": urljoin(TARGET, candidate_url),
                        "tag": tag,
                        "attribute": "srcset",
                        "descriptor": descriptor or None,
                        "rel": values.get("rel"),
                        "as": values.get("as"),
                        "declaredType": values.get("type"),
                    }
                )


def local_path_for(url: str) -> Path:
    parsed = urlparse(url)
    clean_path = unquote(parsed.path).lstrip("/") or "index.html"
    path = RAW_PUBLIC_DIR / clean_path
    if path.suffix:
        return path
    return path.with_suffix(".bin")


def should_download(url: str, record: dict) -> bool:
    parsed = urlparse(url)
    if parsed.netloc != "datacurve.ai":
        return False
    suffix = Path(parsed.path).suffix.lower()
    resource_types = set(record.get("resourceTypes", []))
    if suffix in {".js", ".css"} or resource_types & {"Script", "Stylesheet"}:
        return True
    if parsed.path == "/gifs/depth-scenes.json":
        return True
    if parsed.path.startswith("/api/depth-assets/media/depth-clip-") and suffix == ".mp4":
        return True
    return False


def role_for(url: str, record: dict) -> str:
    parsed = urlparse(url)
    path = parsed.path
    mime = record.get("mimeType") or ""
    resource_types = set(record.get("resourceTypes", []))
    if path == "/":
        return "Next.js server-rendered homepage document"
    if path == "/gifs/depth-scenes.json":
        return "Particle scene manifest describing depth-video sources and scene metadata"
    if path.startswith("/api/depth-assets/media/depth-clip-"):
        return "Depth-map video sampled by the particle vertex shader"
    if "_next/static/chunks" in path and path.endswith(".css"):
        return "Compiled site stylesheet"
    if "_next/static/chunks" in path and path.endswith(".js"):
        if "turbopack" in path:
            return "Next.js/Turbopack runtime"
        if path.endswith("/07acnwh_9824e.js"):
            return "Homepage interaction orchestrator, React UI, and Lenis 1.3.23 smooth scrolling"
        if path.endswith("/0s99a.txitfa_.js"):
            return "Dynamically imported Three.js r184 DotMorph particle renderer and shaders"
        if path.endswith("/0xyc02bewuh8y.js"):
            return "Route-prefetched chunk containing GSAP 3.15.0 and ScrollTrigger; not the particle driver"
        return "Compiled Next.js runtime or application chunk; rendering role refined in architecture.md"
    if path.endswith("/120ee41005470f3c/script.js"):
        return "Vercel Web Analytics client"
    if path.endswith("/fcfda350746e391d/script.js"):
        return "Vercel Speed Insights client"
    if path.endswith(".woff2"):
        return "Web font"
    if path.endswith(".svg") or mime == "image/svg+xml":
        return "Brand or editorial vector image"
    if "/_next/image" in path:
        return "Next.js optimized editorial/footer raster image"
    if path.endswith(".jpg") or path.endswith(".jpeg") or path.endswith(".webp"):
        return "Editorial raster image"
    if "_rsc" in parsed.query or mime == "text/x-component":
        return "Next.js React Server Component route prefetch"
    if parsed.netloc == "ph.shipd.ai":
        return "Third-party PostHog analytics/session-replay runtime"
    if resource_types == {"Document"}:
        return "Page document"
    return "Public frontend resource"


def download(url: str, destination: Path) -> tuple[str | None, int]:
    destination.parent.mkdir(parents=True, exist_ok=True)
    headers_path = destination.with_name(destination.name + ".headers.txt")
    command = [
        "curl",
        "-L",
        "--compressed",
        "--fail",
        "--silent",
        "--show-error",
        "--retry",
        "2",
        "-A",
        "Mozilla/5.0 DatacurveResearch/1.0",
        "-D",
        str(headers_path),
        "-o",
        str(destination),
        url,
    ]
    subprocess.run(command, check=True)
    content_type = None
    for line in headers_path.read_text(errors="replace").splitlines():
        if line.lower().startswith("content-type:"):
            content_type = line.split(":", 1)[1].strip().split(";", 1)[0]
    return content_type, destination.stat().st_size


def main() -> None:
    parser = AssetParser()
    parser.feed((RESEARCH_DIR / "index.html").read_text())
    network = json.loads((RESEARCH_DIR / "network-requests.json").read_text())

    records: dict[str, dict] = {}
    initial_by_url: dict[str, list[dict]] = defaultdict(list)
    for item in parser.assets:
        key = asset_key(item["url"])
        initial_by_url[key].append({k: v for k, v in item.items() if k != "url"})
        records.setdefault(key, {"url": key})

    for request in network["requests"]:
        url = request["url"]
        key = asset_key(url)
        record = records.setdefault(key, {"url": key})
        if key != url:
            record.setdefault("observedUrls", [])
            if url not in record["observedUrls"]:
                record["observedUrls"].append(url)
        record.setdefault("resourceTypes", [])
        if request.get("resourceType") and request["resourceType"] not in record["resourceTypes"]:
            record["resourceTypes"].append(request["resourceType"])
        record.setdefault("phases", [])
        if request.get("phase") and request["phase"] not in record["phases"]:
            record["phases"].append(request["phase"])
        record.setdefault("statuses", [])
        if request.get("status") is not None and request["status"] not in record["statuses"]:
            record["statuses"].append(request["status"])
        if request.get("mimeType"):
            record["mimeType"] = request["mimeType"]
        record.setdefault("observedEncodedSizes", [])
        if request.get("encodedDataLength") is not None:
            size = request["encodedDataLength"]
            if size not in record["observedEncodedSizes"]:
                record["observedEncodedSizes"].append(size)
        if not record.get("initiator") and request.get("initiator"):
            record["initiator"] = request["initiator"]
        record["dynamic"] = bool(record.get("dynamic") or request.get("dynamic"))

    assets = []
    downloaded_paths: dict[Path, tuple[str | None, int]] = {}
    for key in sorted(records):
        record = records[key]
        url = record["url"]
        record["initialHtmlReferences"] = initial_by_url.get(key, [])
        record["initialHtmlReference"] = bool(record["initialHtmlReferences"])
        record["role"] = role_for(url, record)
        record.setdefault("mimeType", mimetypes.guess_type(urlparse(url).path)[0])
        record.setdefault("initiator", None)
        record.setdefault("resourceTypes", [])
        record.setdefault("phases", [])
        record.setdefault("statuses", [])
        record.setdefault("observedEncodedSizes", [])
        record.setdefault("dynamic", False)
        record["localPath"] = None
        if url == TARGET:
            record["localPath"] = "index.html"
            record["sizeBytes"] = (RESEARCH_DIR / "index.html").stat().st_size
        elif should_download(url, record):
            destination = local_path_for(url)
            if destination not in downloaded_paths:
                downloaded_paths[destination] = download(url, destination)
            downloaded_mime, size = downloaded_paths[destination]
            record["localPath"] = str(destination.relative_to(RESEARCH_DIR))
            record["sizeBytes"] = size
            if downloaded_mime:
                record["mimeType"] = downloaded_mime
        else:
            sizes = record["observedEncodedSizes"]
            record["sizeBytes"] = max(sizes) if sizes else None
        assets.append(record)

    manifest = {
        "capturedAt": network["capturedAt"],
        "target": TARGET,
        "notes": [
            "Only same-origin JS/CSS and particle-relevant depth data/media were downloaded.",
            "Fonts, editorial images, RSC route-prefetch payloads, and third-party-hosted analytics are enumerated but not retained.",
            "Observed encoded sizes are transfer sizes from CDP; sizeBytes is local decoded size when downloaded.",
            "Initial HTML references include src, href, and every declared srcset candidate.",
            "dynamic is true for script requests absent from the initial HTML; scroll itself issued no additional requests.",
            "Cache-busted depth-scenes.json requests are grouped under one canonical URL and retained in observedUrls.",
        ],
        "assets": assets,
    }
    (RESEARCH_DIR / "assets-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Wrote {len(assets)} manifest entries.")
    print(f"Downloaded {len(downloaded_paths)} unique files under {RAW_PUBLIC_DIR}.")


if __name__ == "__main__":
    main()
