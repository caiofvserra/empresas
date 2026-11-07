"""O modelo treinado do estudo do PNCP: carrega o pacote_reuso.joblib e dá a probabilidade de cada objeto ser engenharia ou obra.

O pacote traz o classificador (um ensemble calibrado), o limiar escolhido na validação e o nome do encoder de frases
(BAAI/bge-m3). O encoder vem do Hugging Face na primeira vez. Precisa de sentence-transformers, scikit-learn e joblib.
"""
import sys

import numpy as np

from .texto import limpar_objeto


class EnsembleMedia:
    """Média das probabilidades de vários classificadores calibrados. O pacote foi salvo num caderno, então o pickle procura
    esta classe em __main__: ela precisa existir lá antes do joblib.load, com a mesma definição do treino."""

    def __init__(self, modelos_calibrados, nomes):
        self.modelos = list(modelos_calibrados)
        self.nomes = list(nomes)

    def predict_proba(self, X):
        return np.mean([m.predict_proba(X) for m in self.modelos], axis=0)

    def predict(self, X):
        return (self.predict_proba(X)[:, 1] >= 0.5).astype(int)


class Modelo:
    def __init__(self, caminho):
        import joblib
        setattr(sys.modules['__main__'], 'EnsembleMedia', EnsembleMedia)
        pacote = joblib.load(caminho)
        self.classificador, self.limiar = pacote['modelo'], float(pacote['limiar'])
        self.nome_emb, self.prefixo = pacote['nome_emb'], pacote.get('prefixo_emb') or ''
        self.metadados = {'limiar': self.limiar, 'embeddings': self.nome_emb, 'treinado_em': pacote.get('gerado_em', ''),
                          'n_treino': int(pacote.get('n_treino') or 0)}
        self._encoder = None

    def probabilidades(self, objetos, lote=None):
        from sentence_transformers import SentenceTransformer
        if self._encoder is None:
            self._encoder = SentenceTransformer(self.nome_emb)
            self._encoder.max_seq_length = 192  # o mesmo do treino: o objeto cabe inteiro em quase todo contrato
        import torch
        lote = lote or (128 if torch.cuda.is_available() else 16)
        X = self._encoder.encode([self.prefixo + limpar_objeto(t) for t in objetos], batch_size=lote, convert_to_numpy=True,
                                 normalize_embeddings=True, show_progress_bar=len(objetos) > 500)
        return self.classificador.predict_proba(X)[:, 1]
