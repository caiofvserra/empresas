"""Triagem dos contratos de serviços gerais do PNCP em São Paulo que parecem engenharia (ação 4, 07/11/2026).

Usa o modelo treinado do estudo do PNCP (pacote_reuso.joblib, com o classificador, o limiar e o nome do encoder) para marcar os
contratos que o órgão publicou como serviços gerais e que têm objeto de engenharia, e lê os documentos da compra no PNCP atrás
de sinal do rito de engenharia (ART, Crea, engenheiro responsável). Quem roda é scripts/pncp-triagem.py; o cruzamento com as ARTs
é feito na base interna por integrations/sql/pncp-triagem-x-art.sql. O valor do contrato não entra em nenhuma saída.
"""
