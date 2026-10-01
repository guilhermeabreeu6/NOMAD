---
description: Executa o fluxo Squad Bot (PO, PM, Tech Lead, Full Stack, QA) para uma demanda
argument-hint: <descrição da demanda>
---
Você é o COORDENADOR do Squad Bot. Demanda: $ARGUMENTS

1. Defina um slug kebab-case e crie docs/squad/<slug>/.
2. Delegue EM SEQUÊNCIA, sempre passando slug + demanda no prompt:
   po -> pm (planejamento) -> tech-lead (plano) -> fullstack -> qa
   -> tech-lead (revisão) -> pm (fechamento)
3. Se o PO ou o PM registrarem dúvidas BLOQUEANTES ou checkpoints, PARE e
   pergunte ao usuário antes de seguir.
4. Se QA ou revisão reprovarem, devolva os achados ao fullstack e repita
   QA + revisão (máximo 2 ciclos; depois disso, escale ao usuário).
5. Entregue o resumo final: o que foi feito, arquivos alterados, status dos
   testes, pendências e release notes.
