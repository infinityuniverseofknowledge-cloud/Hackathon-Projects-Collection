# EcoGenesis AI

Sustainability intelligence platform — assess your footprint, get recommendations, track goals. Runs entirely in the browser. No accounts, no tracking.

Author: Miqueias B Werlich
Challenge: Sustain-a-thon 2.0
License: MIT

## Como abrir no Android

1. Abra o app **Arquivos** do Android
2. Navegue até **Downloads** > **EcoGenesisAI**
3. Toque em **index.html**
4. Escolha abrir com **Chrome** (ou qualquer navegador)

Pronto. Funciona offline, sem servidor, sem instalação.

## Alternativa: servidor local (Termux)

Se preferir servir via HTTP:

    cd ~/storage/downloads/EcoGenesisAI
    python3 -m http.server 8000

Depois abra no Chrome: http://localhost:8000

## Recursos

- Assessment com validação completa
- Cálculo de emissões documentado
- Score 0-100 transparente
- Recomendações baseadas nos seus dados reais
- Metas com progresso e prazos
- Export CSV e JSON
- Persistência em localStorage
- Dados demo claramente rotulados
- Responsivo mobile

## Estrutura

    EcoGenesisAI/
      index.html                ← APP PRINCIPAL
      README.md
      logic.py                  ← espelho Python para testes
      data/
        emission_factors.json
      tests/
        test_logic.py

## Testes (opcional)

    cd EcoGenesisAI
    pip install pytest
    pytest tests/ -v

## Metodologia

**Fatores são DEMO VALUES**, não constantes científicas.
- Eletricidade: 0.45 kg CO2e/kWh (média global ilustrativa)
- Água: 0.0003 kg CO2e/L
- Resíduos: 0.5 kg CO2e/kg (aterro)
- Transporte: 0.192 kg CO2e/km (carro médio)

Fórmula:

    estimated_emissions = activity_value * emission_factor

Score:

    energy = 100 - max(0, pp - 150) * 0.15
    water  = 100 - max(0, pp - 3000) * 0.008
    waste  = (diverted / total) * 100
    TOTAL = energy*0.35 + water*0.30 + waste*0.35

Benchmarks (150 kWh, 3000 L) são ilustrativos, não oficiais.

## Privacidade

- Zero chamadas de rede
- Zero API keys
- Zero telemetria
- Todos os dados ficam no localStorage do navegador

## Limitações

- Fatores são demos, não medições verificadas
- Score é indicador customizado, não certificação
- Água só conta tratamento + bombeamento
- Resíduos assumem aterro (reciclagem não modelada separadamente)
- Dados perdidos se limpar o navegador

## Licença

MIT
