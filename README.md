# Vice City Key Shop — edição local

Esta versão funciona sem Supabase, sem banco de dados externo e sem serviços pagos.

## Como iniciar no Windows

1. Instale o Node.js LTS.
2. Abra o PowerShell dentro da pasta do projeto.
3. Execute, um comando por vez:

```powershell
npm install
npm run dev
```

4. Abra o endereço local exibido pelo Vite (normalmente http://localhost:3000).

## Como os dados funcionam

O catálogo, o estoque de códigos e os pedidos são armazenados no localStorage do navegador. Portanto, os dados ficam apenas neste navegador e neste dispositivo. Limpar os dados do navegador pode apagar o estoque e os pedidos. Esta edição não sincroniza dados entre amigos ou computadores.

Os códigos são códigos internos de demonstração da Vice City Key Shop. Resgatá-los libera um item apenas dentro desta loja; não concede licença oficial de PlayStation, Rockstar, Steam ou outra plataforma. A compra é simulada e não processa pagamentos.

## Projeto

A interface usa React, TanStack Start e Vite. Supabase não é necessário nesta edição.
