# Changelog
Todas as alterações relevantes deste projeto serão documentadas aqui.

O formato segue o [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/)
e este projeto adota [Versionamento Semântico 2.0.0](https://semver.org/lang/pt-BR/).

## [Unreleased]
### Added
- (adicione aqui novas funcionalidades que ainda não foram lançadas)

### Changed
- (mudanças de comportamento sem quebra de compatibilidade)

### Fixed
- (correções de bugs)

### Deprecated
- (APIs/funcionalidades marcadas para remoção futura)

### Removed
- (itens removidos nesta versão não lançada)

### Security
- (correções/avisos de segurança)

---

## [1.0.0] — 2025-09-17
### Added
- **Módulo Padrão**: `+ − × ÷ %`, parênteses, memória (MC/MR/M+/M-/MS), `1/x`, `x²`, `√x`, `±`, `π`, `e`, `CE`, `C`, backspace.
- **Módulo Científica**: `sin`, `cos`, `tan`, `ln`, `log10`, `x^y`, `√`, `x²`, `1/x`, `n!` (com extensão via **Gamma** para não inteiros), **Deg/Rad**.
- **Módulo Programador**:
  - Conversões em tempo real entre **binário, octal, decimal e hexadecimal**.
  - **Bitwise**: `AND`, `OR`, `XOR`, `NOT`, `<<`, `>>` e **SHIFT n**.
  - **Largura de palavra**: 8/16/32/64 bits; **com/sem sinal** (two’s complement).
  - **Teclado dinâmico** que adapta dígitos conforme a base ativa.
- **Parser próprio seguro** (Shunting-yard → RPN) — sem `eval`.
- **Histórico** por módulo, persistido em `localStorage`, com copiar/limpar.
- **Tema claro/escuro** persistente.
- **Atalhos de teclado** (Enter, Backspace, Esc, operadores).
- **PWA completo**: `manifest.webmanifest`, `service-worker.js`
  (App Shell com cache-first para assets locais e network-first para CDNs).
- **Ícones** 192/512 e versões **maskable**.
- **Exportar configurações** (tema + históricos) como JSON.
- **Acessibilidade**: foco visível, labels/aria, contraste.
- **Documentação**: `README.md`, `LICENSE` (MIT) e `CHANGELOG.md`.
- **Deploy**: pronto para **GitHub Pages**; workflow opcional em `.github/workflows/pages.yml`.

### Changed
- —

### Fixed
- —

### Security
- —

---


[Unreleased]: https://github.com/marcos-zorzetto/calculadora-bases.git
[1.0.0]: https://github.com/marcos-zorzetto/calculadora-bases.git
