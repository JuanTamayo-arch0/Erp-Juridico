<!--
Sync Impact Report

- Version change: unset -> 1.0.0
- Modified principles: Template placeholders -> Complete Spanish constitution for "ERP para Despachos Jurídicos"
- Added sections: Full Principles (1..10), Application, Governance details
- Removed sections: Template placeholder headings and generic placeholders
- Templates requiring updates:
	- .specify/templates/plan-template.md ✅ updated
	- .specify/templates/spec-template.md ⚠ pending (small suggested updates applied)
	- .specify/templates/tasks-template.md ✅ updated
	- .specify/templates/agent-file-template.md ⚠ pending (no changes required now)
- Follow-up TODOs:
	- TODO(RATIFICATION_DATE): confirm explicit project ratification date if different from commit date
	- Review `.specify/templates/commands/*.md` for any agent-specific references and update manually if needed
-->

# Constitution - ERP para Despachos Jurídicos

## PRINCIPIOS FUNDAMENTALES

Este documento establece los principios rectores que guiarán todas las decisiones de diseño, desarrollo e implementación del sistema ERP para Despachos Jurídicos. Estos principios son inmutables y deben consultarse ante cualquier dilema técnico o de producto.

---

## 1. USUARIO PRIMERO, SIEMPRE

### 1.1 Simplicidad sobre Complejidad
- **Principio**: Cuando exista duda entre una solución simple y una compleja, MUST elegir la simple.
- **Razón**: Nuestros usuarios son abogados, no ingenieros de software. El sistema debe "simplemente funcionar".
- **Aplicación práctica**:
	- Formularios con máximo 7 campos visibles simultáneamente
	- Wizards paso-a-paso para procesos complejos
	- Defaults inteligentes que reduzcan decisiones del usuario
	- NUNCA exponer configuraciones técnicas al usuario final

### 1.2 Velocidad Percibida = Velocidad Real
- **Principio**: La percepción de rapidez es tan importante como la rapidez real.
- **Aplicación práctica**:
	- Skeleton screens en lugar de spinners genéricos
	- Optimistic UI updates (mostrar cambio antes de confirmación del servidor)
	- Preload de datos anticipados
	- Máximo 300ms de delay entre acción del usuario y feedback visual
	- Si operación toma >2s, mostrar progress bar con mensaje informativo

### 1.3 Zero Learning Curve para Funcionalidades Básicas
- **Principio**: Crear caso, subir documento y ver calendario NO debe requerir manual.
- **Aplicación práctica**:
	- Iconos universales (no inventar iconografía nueva)
	- Labels claros en español colombiano (no "spanglish")
	- Tooltips contextuales solo cuando sea necesario
	- Onboarding interactivo pero optional (poder saltarlo)

### 1.4 Mensajes de Error son Oportunidades de Enseñanza
- **Principio**: NUNCA mostrar mensajes técnicos al usuario. Cada error es una oportunidad de guiar.
- **❌ MAL**: "500 Internal Server Error"
- **❌ MAL**: "ValidationError: campo 'cliente' es requerido"
- **✅ BIEN**: "Por favor selecciona un cliente para continuar"
- **✅ BIEN**: "No pudimos guardar los cambios. Verifica tu conexión e intenta de nuevo."
- **Aplicación práctica**:
	- Siempre decir QUÉ pasó y QUÉ hacer para solucionarlo
	- Usar lenguaje positivo ("selecciona" en vez de "falta")
	- Incluir botón de acción directa cuando sea posible

---

## 2. SEGURIDAD Y CONFIDENCIALIDAD SON INNEGOCIABLES

### 2.1 Datos del Cliente son Sagrados
- **Principio**: La información de casos y clientes es confidencial por ley. Un breach puede destruir la reputación del despacho.
- **Aplicación práctica**:
	- NUNCA logs de producción con datos sensibles (nombres, IDs, contenido de documentos)
	- Cifrado obligatorio para documentos confidenciales
	- Permisos verificados en CADA request (nunca solo en UI)
	- Auditoría de TODAS las operaciones críticas
	- Tests de seguridad en CI/CD

### 2.2 Principio de Mínimo Privilegio
- **Principio**: Cada usuario debe tener solo los permisos estrictamente necesarios para su función.
- **Aplicación práctica**:
	- Auxiliares NO eliminan casos ni ven documentos confidenciales
	- Abogados Junior solo editan casos asignados a ellos
	- Solo Admins configuran usuarios y sistema
	- Permisos granulares a nivel de acción (crear/leer/actualizar/eliminar)

### 2.3 Transparencia en Seguridad
- **Principio**: Usuarios deben saber qué está pasando con sus datos.
- **Aplicación práctica**:
	- Log de auditoría accesible: "Quién vio qué y cuándo"
	- Notificación cuando documento confidencial es accedido
	- Política de privacidad clara y visible
	- Proceso claro para solicitud de datos (ARCO)

---

## 3. CALIDAD DEL CÓDIGO ES CALIDAD DEL PRODUCTO

### 3.1 Código Legible > Código Clever
- **Principio**: Preferir código que cualquier desarrollador pueda entender en 5 minutos vs código "inteligente" que requiere análisis profundo.
- **Aplicación práctica**:
	- Nombres de variables descriptivos (no abreviaciones crípticas)
	- Funciones pequeñas con responsabilidad única (max 50 líneas)
	- Comentarios solo para lógica compleja, no para obviedades
	- Evitar optimizaciones prematuras

### 3.2 Tests No Son Opcionales
- **Principio**: Código sin tests es código roto esperando a romperse.
- **Aplicación práctica**:
	- Cobertura mínima: 70% backend, 60% frontend
	- Tests unitarios para lógica de negocio crítica
	- Tests E2E para flujos completos (crear caso, subir documento)
	- Tests de seguridad automatizados (ej: intentar acceder a caso sin permisos)
	- CI/CD falla si tests no pasan

### 3.3 Refactorización Continua
- **Principio**: Dejar el código mejor de como lo encontraste.
- **Aplicación práctica**:
	- Boy Scout Rule: Si ves código mejorable, mejóralo (si tienes tiempo y tests)
	- Dedic ar 15% del tiempo de desarrollo a refactoring
	- Tech debt no se ignora, se documenta y se prioriza
	- Code reviews obligatorios con checklist de calidad

### 3.4 Documentación es Parte del Código
- **Principio**: Si no está documentado, no existe.
- **Aplicación práctica**:
	- README en cada módulo con propósito y ejemplos de uso
	- Docstrings en funciones críticas
	- Swagger/OpenAPI para todas las APIs
	- Changelog actualizado en cada release
	- Arquitectura documentada en diagramas (C4 Model)

---

## 4. PERFORMANCE MATTERS

### 4.1 Cada Segundo Cuenta
- **Principio**: Usuarios abandonan sistemas lentos. 3 segundos de espera parecen eternidad.
- **Aplicación práctica**:
	- Consultas SQL optimizadas con índices apropiados
	- Paginación obligatoria (nunca cargar 1000+ registros)
	- Lazy loading de componentes pesados
	- CDN para assets estáticos
	- Benchmarks de performance en tests automatizados

### 4.2 Escalabilidad desde el Día 1
- **Principio**: Diseñar para 20 usuarios pero preparar para 100.
- **Aplicación práctica**:
	- Backend stateless (no sesiones en memoria del servidor)
	- Uso de Redis para cache distribuido
	- Queries optimizadas desde el inicio (no "ya optimizaremos después")
	- Database connection pooling
	- Arquitectura que permita horizontal scaling

### 4.3 Monitoreo es Obligatorio
- **Principio**: No puedes mejorar lo que no mides.
- **Aplicación práctica**:
	- Sentry para error tracking con alertas automáticas
	- Logs estructurados con niveles apropiados
	- Métricas de performance en producción (Prometheus/Grafana o similar)
	- Health checks automatizados
	- Dashboards de KPIs técnicos accesibles para equipo de desarrollo

---

## 5. EXPERIENCIA DE USUARIO ES DIFERENCIADOR

### 5.1 Diseño Consistente
- **Principio**: Inconsistencia crea confusión. Confusión crea frustración.
- **Aplicación práctica**:
	- Sistema de diseño unificado (Tailwind con configuración custom)
	- Componentes reutilizables (Button, Input, Modal, etc.)
	- Espaciado consistente (escala de 4px)
	- Colores semánticos claros (verde=éxito, rojo=error, amarillo=advertencia)
	- Iconos del mismo paquete (no mezclar)

### 5.2 Feedback Inmediato
- **Principio**: Usuario nunca debe preguntarse "¿funcionó o no funcionó?"
- **Aplicación práctica**:
	- Toast notifications para operaciones exitosas
	- Estados de carga visibles (spinners, progress bars)
	- Deshabilitar botones durante operación (prevenir double-submit)
	- Cambios visuales inmediatos (color, borde, ícono)
	- Sonidos sutiles para notificaciones críticas (opcional)

### 5.3 Accesibilidad No Es Opcional
- **Principio**: Sistema debe ser usable por personas con discapacidades.
- **Aplicación práctica**:
	- Contraste mínimo WCAG 2.1 AA (4.5:1)
	- Navegación completa por teclado (tab order lógico)
	- ARIA labels en iconos y botones sin texto
	- Tamaños de fuente escalables
	- Testeo con screen readers (NVDA/JAWS)

### 5.4 Mobile-Friendly (Aunque No Mobile-First)
- **Principio**: Aunque prioridad es desktop, usuarios consultarán desde tablets.
- **Aplicación práctica**:
	- Responsive design con breakpoints claros
	- Vistas de consulta (dashboard, casos, clientes) funcionales en tablet
	- Edición compleja OK si es solo desktop
	- Touch targets mínimo 44x44px en móvil
	- No hover-only interactions (no funcionan en touch)

---

## 6. DATOS SON EL ACTIVO MÁS VALIOSO

### 6.1 Nunca Perder Datos
- **Principio**: Un documento perdido puede costar un caso. Un caso perdido puede costar el cliente.
- **Aplicación práctica**:
	- Backups automáticos diarios cifrados
	- Retención: 7 días diarios, 4 semanas semanales, 12 meses mensuales
	- Pruebas de restauración trimestrales documentadas
	- Soft delete para todo (papelera de 30 días antes de borrado físico)
	- Confirmaciones obligatorias antes de eliminar

### 6.2 Integridad de Datos
- **Principio**: Datos inconsistentes son peor que no tener datos.
- **Aplicación práctica**:
	- Validaciones en frontend Y backend (nunca confiar solo en UI)
	- Foreign keys con ON DELETE RESTRICT (no borrar padres si tienen hijos)
	- Transacciones de BD para operaciones multi-tabla
	- Validaciones de tipo (TypeScript en frontend, type hints en backend)
	- Migraciones de BD testeadas en staging antes de producción

### 6.3 Auditoría Completa
- **Principio**: Debe ser posible reconstruir CUALQUIER operación crítica.
- **Aplicación práctica**:
	- Log de auditoría con: Quién, Qué, Cuándo, Desde Dónde (IP)
	- Versionado de documentos automático
	- Historial de cambios en casos (quién modificó qué campo)
	- Logs inmutables (append-only, no se pueden editar)
	- Retención mínima 2 años para logs de auditoría

---

## 7. DESARROLLO ÁGIL Y PRAGMÁTICO

### 7.1 MVP Primero, Perfección Después
- **Principio**: Entregar funcionalidad básica rápido > Esperar meses para funcionalidad perfecta.
- **Aplicación práctica**:
	- Definir alcance de MVP estricto (lo mínimo para ser útil)
	- Features NO incluidas en MVP se documentan en roadmap, no se implementan
	- Iterar basado en feedback real de usuarios
	- Lanzar beta interna antes de producción
	- No pulir UX de features que usuarios quizás no usen

### 7.2 Ship Early, Ship Often
- **Principio**: Releases pequeños y frecuentes > Releases grandes y espaciados.
- **Aplicación práctica**:
	- Sprints de 2 semanas con entregables funcionales
	- Deploy a staging cada merge a develop
	- Deploy a producción cada 2-4 semanas (no acumular cambios)
	- Feature flags para controlar rollout de funcionalidades nuevas
	- Rollback debe ser rápido y seguro

### 7.3 Technical Debt es Realidad, No Excusa
- **Principio**: Tech debt es inevitable, pero debe ser consciente y gestionado.
- **Aplicación práctica**:
	- Documentar decisiones de tech debt (README, comentarios, issues)
	- Dedicar 15-20% del tiempo a pagar tech debt
	- Nunca acumular tech debt en áreas críticas (seguridad, auditoría)
	- Refactoring es parte del desarrollo, no "tiempo extra"
	- Balance: Velocidad de entrega vs calidad sostenible a largo plazo

### 7.4 Comunicación Clara y Documentada
- **Principio**: En equipo pequeño, comunicación asíncrona es clave.
- **Aplicación práctica**:
	- Decisiones técnicas importantes en GitHub Issues/Discussions
	- PRs con descripción clara de QUÉ cambia y POR QUÉ
	- Conventional Commits para historial semántico
	- Meetings solo cuando necesario (default: comunicación escrita)
	- Documentación actualizada con cada cambio significativo

---

## 8. CONTEXTO LEGAL COLOMBIANO MATTERS

### 8.1 Terminología Correcta
- **Principio**: Sistema debe hablar el idioma de los abogados colombianos.
- **Aplicación práctica**:
	- "Radicado" no "número de caso"
	- "Juzgado" no "corte"
	- "Expediente" no "file"
	- "Término" no "deadline"
	- Tipos de proceso según derecho colombiano (Tutela, Laboral, Civil, etc.)

### 8.2 Cumplimiento Legal desde el Diseño
- **Principio**: Ley 1581/2012 (Habeas Data) no es feature, es requisito.
- **Aplicación práctica**:
	- Política de privacidad clara y aceptada en registro
	- Proceso para ejercer derechos ARCO (Acceso, Rectificación, Cancelación, Oposición)
	- Exportación de datos personales en formato legible
	- Opción de eliminación de cuenta (con consecuencias claras)
	- Auditoría de acceso a datos sensibles

### 8.3 Adaptabilidad a Prácticas Locales
- **Principio**: Sistema debe adaptarse al despacho, no despacho al sistema.
- **Aplicación práctica**:
	- Campos personalizables (tags, categorías custom)
	- Configuración de tipos de audiencia según práctica del despacho
	- Plantillas de documentos adaptables
	- Reportes personalizables
	- Sin "best practices" impuestas si no aplican a Colombia

---

## 9. ESCALABILIDAD Y SOSTENIBILIDAD

### 9.1 Código para Humanos, No para Máquinas
- **Principio**: Cualquier desarrollador debe poder contribuir tras 2 días de onboarding.
- **Aplicación práctica**:
	- Arquitectura clara y bien documentada
	- Convenciones de código estrictas (linting automático)
	- Setup del ambiente de desarrollo simple (< 1 hora)
	- README con instrucciones paso a paso
	- Evitar dependencias oscuras o complejas

### 9.2 Modularidad para Evolución
- **Principio**: Nuevas funcionalidades no deben romper existentes.
- **Aplicación práctica**:
	- Módulos independientes con interfaces claras
	- Cambios en un módulo no afectan otros
	- Deprecation gradual (no breaking changes abruptos)
	- Versionado de APIs
	- Feature flags para activar/desactivar funcionalidades

### 9.3 Costo-Beneficio en Decisiones Técnicas
- **Principio**: Tecnología fancy no siempre es mejor. Evaluar costo real.
- **Aplicación práctica**:
	- Preferir tecnologías maduras y bien documentadas
	- Evaluar: ¿Costo de aprendizaje < Beneficio obtenido?
	- Evitar over-engineering (no usar Kubernetes si Railway es suficiente)
	- Considerar costo de mantenimiento a largo plazo
	- Balance: Innovación vs Estabilidad

---

## 10. COLABORACIÓN Y OWNERSHIP

### 10.1 Code Reviews son Aprendizaje Mutuo
- **Principio**: PR review no es solo encontrar errores, es compartir conocimiento.
- **Aplicación práctica**:
	- Feedback constructivo y específico
	- Preguntar "¿por qué?" antes de asumir error
	- Aprender del código de otros
	- Aprobar PRs en < 24 horas (no bloquear progreso)
	- Nitpicks se marcan como "nit:" (no bloqueantes)

### 10.2 Todos Son Responsables de Calidad
- **Principio**: Calidad no es solo responsabilidad de QA, es de todos.
- **Aplicación práctica**:
	- Desarrollador testea su propio código manualmente antes de PR
	- Code reviews verifican lógica, no solo syntax
	- Tests automatizados escritos por quien escribe el código
	- Bugs reportados se documentan con pasos de reproducción
	- Postmortems sin culpa, enfoque en prevención

### 10.3 Ownership Colectivo
- **Principio**: Nadie "es dueño" de un módulo. Todo el equipo es responsable.
- **Aplicación práctica**:
	- Cualquier desarrollador puede modificar cualquier módulo
	- Documentación permite que otros entiendan tu código
	- No "silos" de conocimiento (evitar single points of failure)
	- Rotación de tareas para cross-training
	- Pair programming en features complejas

---

## APLICACIÓN DE ESTOS PRINCIPIOS

### En Caso de Conflicto
Si dos principios parecen contradictorios en un escenario específico, aplicar en este orden de prioridad:

1. **Seguridad y Confidencialidad** (Principio 2)
2. **Usuario Primero** (Principio 1)
3. **Datos son el Activo** (Principio 6)
4. **Calidad del Código** (Principio 3)
5. Resto de principios

### Revisión de Principios
Este constitution NO es inmutable. Se revisa cada 6 meses considerando:
- Lecciones aprendidas del desarrollo
- Feedback de usuarios reales
- Cambios en el contexto (nuevas regulaciones, tecnologías, etc.)

### Enforcement
- Estos principios son parte de checklist de code review
- Decisiones técnicas mayores deben referenciar qué principios aplican
- En retrospectivas, evaluar si principios se están siguiendo

---

**Esta constitution guía TODAS las decisiones del proyecto. Cuando tengas duda, consulta estos principios. Si sigues estos principios, construirás un sistema excelente.**

## Governance

### Procedimiento de Enmienda
- Cualquier propuesta de enmienda debe:
	1. Ser documentada en un Issue de GitHub que explique el cambio, la razón, y el impacto en principios existentes.
	2. Acompañarse de un plan de migración o mitigación si la enmienda afecta compatibilidad o seguridad.
	3. Ser aprobada por al menos 2/3 del equipo técnico y por el responsable de cumplimiento legal cuando aplique.
	4. Ser publicada con un changelog y una entrada en el historial de versiones.

### Política de Versionado de la Constitución
- La Constitución seguirá semver para su numeración:
	- MAJOR: Cambios incompatibles en principios o eliminación/reestructuración de principios centrales.
	- MINOR: Adición de nuevos principios o expansión material de secciones existentes.
	- PATCH: Clarificaciones, correcciones de redacción o ajustes menores sin impacto de gobernanza.

### Revisión y Auditoría de Cumplimiento
- Antes de merges a ramas principales, los cambios técnicos significativos deberán incluir una sección "Constitution Check" en el plan/spec que liste cómo el cambio satisface o justifica desviaciones de los principios.
- El pipeline CI deberá ejecutar comprobaciones automáticas mínimas: linters, tests, escaneo básico de seguridad y validación de políticas de logging/retención cuando aplique.
- Revisión manual semestral: un auditor interno revisará cumplimiento de principios clave (seguridad, manejo de datos, auditoría) y reportará desviaciones.

**Version**: 1.0.0 | **Ratified**: 2025-11-03 | **Last Amended**: 2025-11-03

