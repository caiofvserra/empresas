"""Normalize published user datasets without executing their application code.

Usage: python scripts/import-user-engineer-statistics.py --source-dir DIR
The canonical envelopes remain verbatim under public/data/engineer-statistics.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path


PROJECT = "https://caiofvserra.github.io/engineer-statistics/"
ROOT = Path(__file__).resolve().parents[1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-dir", type=Path, default=ROOT / "public/data/engineer-statistics")
    args = parser.parse_args()
    envelopes = {p.stem: json.loads(p.read_text()) for p in args.source_dir.glob("*.json") if p.stem != "manifest"}
    sources = {s["id"]: s for s in envelopes["fontes"]["data"]}
    used_sources: set[str] = set()

    def provenance(source_id: str) -> dict:
        used_sources.add(source_id)
        source = sources[source_id]
        return {"sourceId": source_id, "sourceUrl": source["url"], "sourceConfidence": source["confianca"]}

    graduates = []
    for series in envelopes["formacao-concluintes"]["data"]["series"]:
        for point in series["valores"]:
            graduates.append({
                "year": int(point["periodo"]), "graduates": point["valor"], "uf": "BR",
                "scope": "engineering-strict" if series["id"] == "estrito" else "cine07-broad",
                "scopeLabel": series["rotulo"], "kind": "flow", "unit": "pessoas/ano",
                **provenance(point.get("fonteId", series["fonteId"])),
            })

    annual_registrations = []
    for series in envelopes["confea-registros-ano"]["data"]["series"]:
        for point in series["valores"]:
            partial = "parcial" in point["periodo"]
            year = int(point["periodo"].split("-")[0])
            annual_registrations.append({
                "year": year, "registrations": point["valor"], "uf": "SP" if series["id"] == "crea-sp-decada" else "BR",
                "partial": partial, "periodEnd": "2026-08-30" if partial else f"{year}-12-31",
                "asOf": "2026-08-30", "scope": "all-system-professions", "scopeLabel": series["rotulo"],
                "kind": "flow", "unit": "registros/ano", **provenance(series["fonteId"]),
            })

    populations = {r["ufCodigo"]: r["valor"] for r in envelopes["populacao-uf"]["data"]["valores"]}
    registrations = []
    for row in envelopes["confea-situacao-uf"]["data"]["valores"]:
        registrations.append({
            "uf": row["crea"].removeprefix("CREA-"), "ufCode": row["ufCodigo"], "professionals": row["ativos"],
            "registeredTotal": row["total"], "interrupted": row["interrompidos"], "cancelled": row["cancelados"],
            "suspended": row["suspensos"], "other": row["outros"], "activeShare": row["percentualAtivos"],
            "year": 2026, "asOf": "2026-08-30", "scope": "all-system-professions", "kind": "stock",
            "unit": "profissionais ativos", "population": populations[row["ufCodigo"]], "populationYear": 2025,
            **provenance("confea-sic-estoque-2026"),
        })
    row = envelopes["confea-situacao-uf"]["data"]["brasil"]
    registrations.append({
        "uf": "BR", "ufCode": "BR", "professionals": row["ativos"], "registeredTotal": row["total"],
        "interrupted": row["interrompidos"], "cancelled": row["cancelados"], "suspended": row["suspensos"],
        "other": row["outros"], "activeShare": row["percentualAtivos"], "year": 2026, "asOf": "2026-08-30",
        "scope": "all-system-professions", "kind": "stock", "unit": "profissionais ativos",
        "population": sum(populations.values()), "populationYear": 2025, **provenance("confea-sic-estoque-2026"),
    })

    engineering_titles = [{
        "uf": r["crea"].removeprefix("CREA-"), "ufCode": r["ufCodigo"], "titles": r["valor"],
        "asOf": "2026-08-30", "scope": "engineering-group", "kind": "stock", "unit": "títulos ativos",
        **provenance("confea-sic-estoque-2026"),
    } for r in envelopes["confea-engenharia-uf"]["data"]["valores"]]

    stock_benchmarks = []
    stock_ids = {"diplomados-censo2022", "ocupados-censo2022", "engenheiros-ativos-2020"}
    for row in envelopes["funil-bases"]["data"]["degraus"]:
        if row["id"] in stock_ids:
            stock_benchmarks.append({
                "id": row["id"], "label": row["rotulo"], "value": row["valor"], "displayValue": row["valorExibicao"],
                "year": int(row["ano"]), "uf": "BR", "kind": "stock", "unit": "pessoas",
                "scope": "cine07-broad" if row["id"] == "diplomados-censo2022" else "engineering-occupation" if row["id"] == "ocupados-censo2022" else "registered-engineers-2020",
                "meaning": row["oQueMede"], "limitations": row["oQueNaoMede"], "nestedWithOtherStocks": False,
                **provenance(row["fonteId"]),
            })

    modality_titles = [{
        "id": r["id"], "modality": r["rotulo"], "titles": r["valor"], "share": r["percentual"],
        "uf": "BR", "asOf": "2026-08-30", "scope": "engineering-group", "kind": "stock", "unit": "títulos ativos",
        **provenance("confea-sic-estoque-2026"),
    } for r in envelopes["confea-modalidades"]["data"]["porModalidadeEngenharia"]]

    salary_occupations = [{
        "cbo": r["cbo"], "occupation": r["ocupacao"], "cboFamily": r["familiaCbo"], "averageMonthlySalary": r["salarioMensal"],
        "weeklyHours": r["jornadaSemanal"], "movements": r["movimentacoes"], "period": r["ano"], "uf": "BR",
        "kind": "period-average", "unit": "R$/mês", "scope": "declared-clt-occupation", **provenance(r["fonteId"]),
    } for r in envelopes["cargos-analista"]["data"]["cbos"]]

    employment = [{
        "cbo": r["cbo"], "occupation": r["ocupacao"], "balance": r["valor"], "period": r["janela"],
        "uf": "BR", "kind": "flow", "unit": "vínculos (saldo)", "scope": "declared-clt-occupation", **provenance(r["fonteId"]),
    } for r in envelopes["caged-saldos"]["data"]["cbos"]]

    provenance_files = [{
        "file": p.name, "sourceUrl": PROJECT + "dados/" + p.name,
        "sha256": hashlib.sha256(p.read_bytes()).hexdigest(), "bytes": p.stat().st_size,
        "localDownloadUrl": "/data/engineer-statistics/" + p.name,
    } for p in sorted(args.source_dir.glob("*.json")) if p.stem != "manifest"]
    result = {
        "metadata": {
            "projectUrl": PROJECT, "projectName": "Onde estão os engenheiros? — Caio Serra",
            "retrievedAt": "2026-10-10", "publishedSnapshot": "2026-09-19", "schemaVersion": "1.0",
            "validation": "Reprodução dos agregados publicados no projeto do usuário; rótulos de confiança pertencem ao projeto de origem, não constituem nova validação primária pelo protótipo.",
            "dataKind": "public-aggregated", "sources": [sources[s] for s in sorted(used_sources)], "files": provenance_files,
            "limitations": [
                "Diplomados do Censo, concluintes do INEP, novos registros do SIC e profissionais ativos têm unidades, universos e competências distintos; não formam um funil de conversão.",
                "Concluintes de engenharia no recorte estrito não se sobrepõem à área ampla CINE 07; anos ausentes não são zeros nem interpolados.",
                "A série nacional de registros abrange todas as profissões do Sistema; o período de 2026 é parcial até 30/08/2026.",
                "A série de novos registros CREA-SP termina em 2022 no retorno coletado pelo autor; anos posteriores não foram estimados.",
                "Títulos de engenharia não equivalem a profissionais distintos. Os valores estaduais ativos incluem todas as profissões do Sistema.",
                "O estoque de diplomados CINE 07 de 2022 permanece citado de fonte secundária; mostrar 2,37 milhões e preservar essa ressalva.",
                "Bases nacionais ou por UF não respondem a filtros locais de município, GRE, CNPJ ou profissional fictício; esses filtros são incompatíveis com o grão disponível.",
                "As médias salariais por CBO cobrem movimentações CLT declaradas e não determinam remuneração individual nem obrigação automática de registro.",
                "A amostra CAGED do projeto contém apenas três CBOs selecionadas, com janelas distintas; não representa toda a engenharia.",
                "Os 600 profissionais e vínculos/empresas do protótipo permanecem demonstrativos e não são identificados nesses agregados públicos.",
            ],
        },
        "graduateAnnual": graduates,
        "annualRegistrations": annual_registrations,
        "registrations": registrations,
        "engineeringTitles": engineering_titles,
        "stockBenchmarks": stock_benchmarks,
        "modalityTitles": modality_titles,
        "salaryOccupations": salary_occupations,
        "employmentBalances": employment,
    }
    dest = ROOT / "src/domain/user-engineer-statistics.json"
    dest.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps({"path": str(dest), "counts": {k: len(v) for k, v in result.items() if isinstance(v, list)}, "canonicalFiles": len(provenance_files)}, ensure_ascii=False))


if __name__ == "__main__":
    main()
