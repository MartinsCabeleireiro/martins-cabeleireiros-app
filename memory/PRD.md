# PRD — Martins Cabeleireiro

## Original problem statement
"Quero um aplicativo para o Martins Cabeleireiro com agendamento de horários, catálogo de serviços de barbearia e cabeleireiro, tabela de preços, endereço e botão para contato via WhatsApp."
Respostas: agendamento salva no painel E abre WhatsApp; painel admin com senha; WhatsApp (69) 99964-0881; Rua Apolinário Cortes, 572 - Nova Ouro Preto, Ouro Preto do Oeste - RO; Seg–Sáb 08:00–20:00; serviços: Corte Masculino e Feminino, Coloração e Luzes, Escova e Hidratação, Designer de Sobrancelha, Outros procedimentos e tratamentos capilares. Estilo escuro e elegante (barbearia clássica), destaque para a logo no topo, identidade moderna e limpa.

## Architecture
- FastAPI (/api) + MongoDB (services, bookings, users, login_attempts); JWT Bearer admin auth (bcrypt), admin seeded from .env
- React + Tailwind + shadcn, framer-motion, lenis; routes `/` (site) and `/admin`
- Images stored locally in /frontend/public/img; SVG logo mark + favicon

## User personas
- Cliente: vê serviços/preços, agenda e confirma no WhatsApp
- Dono do salão: gerencia agendamentos e preços

## Core requirements
Agendamento (serviço, data seg–sáb, horários 30 min 08:00–19:30, sem duplicidade), catálogo, tabela de preços, endereço+mapa, WhatsApp flutuante, painel admin.

## Implemented (2026-10-21)
- Site completo: hero com reveal por linha + emblema 3D da logo, marquee, bento de serviços, tabela de preços, agendamento, localização com mapa, rodapé, botão WhatsApp
- Agendamento salva no banco e abre WhatsApp com mensagem pronta
- Painel /admin: login, lista/filtro de agendamentos, confirmar/cancelar/excluir, WhatsApp do cliente, edição de preços (vazio = "Sob consulta")

## Implemented (2026-10-21, iteração 2)
- Procedimentos individuais com duração: Corte Masculino 30min, Corte Feminino 45min, Coloração 1h30, Luzes 2h30, Escova 40min, Hidratação 45min, Designer de Sobrancelha 20min, Selagem 4h (agrupados nas 5 categorias do catálogo)
- Agenda bloqueia o intervalo inteiro do serviço (sobreposição + término até 20:00), validado no backend e na UI
- Duração exibida no catálogo, tabela de preços, seleção de serviço, resumo (início–término), mensagem WhatsApp e painel admin

## Implemented (2026-10-21, iteração 3)
- Lista oficial de 14 serviços com preços e durações (Corte Masc/Fem, Barba, Sobrancelha, Selagem Masc/Tradicional/Orgânica, Botox Tradicional/Orgânico, Luzes Masculina, Luzes, Coloração, Escova, Hidratação); grupos: Corte e Barba, Coloração e Luzes, Selagem e Botox capilar, Escova e Hidratação, Designer de Sobrancelha
- Bloqueios (coleção blocks): dia inteiro ou intervalo; aplicados na disponibilidade, no calendário público (/api/blocked-days) e na criação de agendamento
- Painel: abas Agenda do dia (linha do tempo 08–20h com atendimentos e bloqueios em tamanho real), Agendamentos, Bloqueios, Preços

## Backlog
- P1: logo oficial do cliente (substituir mark SVG), fotos reais do salão, preços reais (via painel)
- P1: bloquear dias/horários (feriados, folgas)
- P2: lembrete automático, múltiplos profissionais

## Next tasks
- Receber logo/fotos do cliente; cadastrar preços pelo painel
