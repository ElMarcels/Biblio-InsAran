// Traducciones de la interfaz.
//
// La clave es el texto original en castellano (idioma de origen). Solo hace
// falta incluir aquí los textos que se traducen: si una clave no aparece, se
// muestra tal cual en castellano.

import type { Locale } from "./config";
import type { DynamicMessages } from "./translate";

export type Messages = Record<string, string>;

/** Catalán. */
const ca: Messages = {
  // Navegación y estructura
  Catálogo: "Catàleg",
  Autorías: "Autories",
  Materias: "Matèries",
  Panel: "Tauler",
  Salir: "Surt",
  Acceder: "Accedeix",
  Inicio: "Inici",
  "Sesión iniciada como {user}": "Sessió iniciada com a {user}",
  Dueño: "Propietari",
  Editor: "Editor",
  "Biblioteca Institut d'Aran": "Biblioteca Institut d'Aran",
  "Gestión del fondo bibliográfico": "Gestió del fons bibliogràfic",
  "Plataforma interna · {year}": "Plataforma interna · {year}",
  "Saltar al contenido": "Vés al contingut",
  Anterior: "Anterior",
  Siguiente: "Següent",
  Borrado: "Esborrat",
  Borrar: "Esborra",
  "Borrar «{title}»": "Esborra «{title}»",
  "¿Seguro?": "Segur?",
  "Sí, borrar": "Sí, esborra",
  "Confirmar borrado": "Confirma l'esborrat",

  // Portada
  "Fondo bibliográfico · {institution}": "Fons bibliogràfic · {institution}",
  "Consulta el catálogo completo del centro, filtra por categoría o autoría y comprueba la disponibilidad de cada ejemplar. El personal con cuenta puede incorporar nuevos títulos al fondo.":
    "Consulta el catàleg complet del centre, filtra per categoria o autoria i comprova la disponibilitat de cada exemplar. El personal amb compte pot incorporar nous títols al fons.",
  "Buscar en el catálogo": "Cerca al catàleg",
  "Título, autoría o ISBN…": "Títol, autoria o ISBN…",
  Buscar: "Cerca",
  "¿Gestionas el fondo?": "Gestiones el fons?",
  "Accede con tu cuenta": "Accedeix amb el teu compte",
  "para añadir libros.": "per afegir llibres.",
  Títulos: "Títols",
  Ejemplares: "Exemplars",
  Categorías: "Categories",
  Acceso: "Accés",
  Público: "Públic",
  "para consultar": "per consultar",
  "Recién incorporados": "Acabats d'incorporar",
  "Novedades del fondo": "Novetats del fons",
  "Ver catálogo completo": "Veure el catàleg complet",
  "El catálogo todavía está vacío": "El catàleg encara és buit",
  "Cuando se añada el primer libro aparecerá aquí. El personal puede incorporar títulos desde el panel.":
    "Quan s'afegeixi el primer llibre apareixerà aquí. El personal pot incorporar títols des del tauler.",
  "Acceder al panel": "Accedeix al tauler",
  "Explora el fondo": "Explora el fons",
  "Por categoría": "Per categoria",

  // Catálogo
  "Todo el fondo": "Tot el fons",
  "Resultados de “{query}”": "Resultats de “{query}”",
  "Materia: {tag}": "Matèria: {tag}",
  "1 título": "1 títol",
  "{n} títulos": "{n} títols",
  " con los filtros aplicados": " amb els filtres aplicats",
  " en la colección": " a la col·lecció",
  Búsqueda: "Cerca",
  Materia: "Matèria",
  "Ordenar por": "Ordena per",
  "Incorporación reciente": "Incorporació recent",
  "Título (A–Z)": "Títol (A–Z)",
  "Autoría (A–Z)": "Autoria (A–Z)",
  "Más ejemplares": "Més exemplars",
  Filtrar: "Filtra",
  Limpiar: "Neteja",
  Todas: "Totes",
  "Sin resultados": "Sense resultats",
  "No se ha encontrado ningún título con esos criterios. Prueba a quitar algún filtro o a buscar de otra forma.":
    "No s'ha trobat cap títol amb aquests criteris. Prova de treure algun filtre o de cercar d'una altra manera.",
  "Aún no hay libros": "Encara no hi ha llibres",
  "El catálogo todavía no tiene títulos registrados.":
    "El catàleg encara no té títols registrats.",
  "Quitar filtros": "Treu els filtres",
  "Novela negra…": "Novel·la negra…",

  // Ficha de libro
  Disponibilidad: "Disponibilitat",
  "{available} de {total} ejemplares": "{available} de {total} exemplars",
  "1 disponible para préstamo": "1 disponible per a préstec",
  "{n} disponibles para préstamo": "{n} disponibles per a préstec",
  "Todos los ejemplares están prestados":
    "Tots els exemplars estan prestats",
  "1 reserva pendiente": "1 reserva pendent",
  "{n} reservas pendientes": "{n} reserves pendents",
  Estantería: "Prestatge",
  "Editar ficha": "Edita la fitxa",
  Prestar: "Deixa en préstec",
  Reseña: "Ressenya",
  Ficha: "Fitxa",
  Categoría: "Categoria",
  Idioma: "Idioma",
  Editorial: "Editorial",
  Año: "Any",
  Páginas: "Pàgines",
  Ubicación: "Ubicació",
  "Incorporado el {date}{by}.": "Incorporat el {date}{by}.",
  " por {name}": " per {name}",
  "Última edición el {date} por {name}.":
    "Darrera edició el {date} per {name}.",
  "Más de {category}": "Més de {category}",
  "Ver todo": "Veure-ho tot",
  "Libro no encontrado": "Llibre no trobat",
  "Sin ejemplares": "Sense exemplars",
  "{available} de {copies} disp.": "{available} de {copies} disp.",
  "{copies} ej.": "{copies} ex.",

  // Autorías
  "Quién escribe en la biblioteca": "Qui escriu a la biblioteca",
  "1 autoría": "1 autoria",
  "{n} autorías": "{n} autorías",
  "Las autorías se crean solas a partir de los libros del catálogo: al registrar un libro nuevo, su autoría aparece aquí automáticamente.":
    "Les autories es creen soles a partir dels llibres del catàleg: quan es registra un llibre nou, la seva autoria apareix aquí automàticament.",
  "Todavía no hay autorías registradas.":
    "Encara no hi ha autories registrades.",
  "{n} títulos en el catálogo": "{n} títols al catàleg",
  "1 título en el catálogo": "1 títol al catàleg",
  Autoría: "Autoria",
  "en el catálogo": "al catàleg",

  // Materias
  "Etiquetas del catálogo": "Etiquetes del catàleg",
  "1 etiqueta": "1 etiqueta",
  "{n} etiquetas": "{n} etiquetes",
  "Materias libres que el personal añade a cada libro. El tamaño indica cuántos títulos llevan la etiqueta.":
    "Matèries lliures que el personal afegeix a cada llibre. La mida indica quants títols porten l'etiqueta.",
  "Todavía no hay etiquetas. Puedes añadirlas al registrar o editar un libro.":
    "Encara no hi ha etiquetes. Les pots afegir en registrar o editar un llibre.",

  // Acceso
  "Acceso restringido": "Accés restringit",
  "El panel de la ": "El tauler de la ",
  "biblioteca.": "biblioteca.",
  "La consulta del catálogo es pública. Para incorporar o editar títulos hace falta una cuenta que la dirección del centro haya creado previamente.":
    "La consulta del catàleg és pública. Per incorporar o editar títols cal un compte que la direcció del centre hagi creat prèviament.",
  "Entra con tu usuario y contraseña.": "Entra amb el teu usuari i contrasenya.",
  "Añade libros desde el panel.": "Afegeix llibres des del tauler.",
  "Aparecerán al instante en el catálogo.": "Apareixeran a l'instant al catàleg.",
  "Iniciar sesión": "Inicia la sessió",
  "¿Necesitas una cuenta? Solo la dirección de la biblioteca puede crearlas desde su panel.":
    "Necessites un compte? Només la direcció de la biblioteca els pot crear des del seu tauler.",
  "Nombre de usuario": "Nom d'usuari",
  Contraseña: "Contrasenya",
  Entrar: "Entra",
  "Entrando…": "Entrant…",

  // Errores
  "No hemos encontrado esta página": "No hem trobat aquesta pàgina",
  "Puede que el enlace esté mal escrito o que el libro ya no esté en el catálogo.":
    "Potser l'enllaç està mal escrit o el llibre ja no és al catàleg.",
  "Ir al catálogo": "Vés al catàleg",
  "Volver al inicio": "Torna a l'inici",
  "Algo no ha funcionado": "Alguna cosa no ha funcionat",
  "Se ha producido un error inesperado. Vuelve a intentarlo; si el problema continúa, avisa a la persona responsable de la plataforma.":
    "S'ha produït un error inesperat. Torna-ho a provar; si el problema continua, avisa la persona responsable de la plataforma.",
  "Ref. {digest}": "Ref. {digest}",
  Reintentar: "Torna-ho a provar",

  // Panel: navegación
  Resumen: "Resum",
  Libros: "Llibres",
  "Añadir libro": "Afegeix un llibre",
  Lectores: "Lectors",
  Préstamos: "Préstecs",
  Reservas: "Reserves",
  Usuarios: "Usuaris",
  Actividad: "Activitat",
  "Mi cuenta": "El meu compte",
  "Panel de gestión": "Tauler de gestió",
  "Dueño de la plataforma": "Propietari de la plataforma",

  // Panel: resumen
  "Libros distintos en el fondo": "Llibres diferents al fons",
  "Suma de copias físicas": "Suma de còpies físiques",
  "En préstamo": "En préstec",
  "{n} vencidos": "{n} vençuts",
  "{n} vencido": "{n} vençut",
  "Reservas pendientes": "Reserves pendents",
  "Libros esperando estar libres": "Llibres esperant estar lliures",
  "Lectores activos": "Lectors actius",
  "Personas con carné en vigor": "Persones amb carnet en vigor",
  "Usuarios editores": "Usuaris editors",
  "Tu rol": "El teu rol",
  "Cuentas además de la tuya": "Comptes a més del teu",
  "Puedes gestionar préstamos y libros": "Pots gestionar préstecs i llibres",
  "Acciones rápidas": "Accions ràpides",
  "Registrar préstamo": "Registra un préstec",
  "Ver vencidos ({n})": "Veure vençuts ({n})",
  "Gestionar usuarios": "Gestiona usuaris",
  "Ver catálogo público": "Veure el catàleg públic",
  "Últimos cambios": "Darrers canvis",
  "Ver todos": "Veure-ho tot",
  "Todavía no hay libros.": "Encara no hi ha llibres.",
  "Añade el primero": "Afegeix el primer",
  "Actividad reciente": "Activitat recent",
  "El historial de actividad está disponible para la cuenta de dueño de la plataforma.":
    "L'historial d'activitat està disponible per al compte de propietari de la plataforma.",
  "Aún no se ha registrado ninguna acción.":
    "Encara no s'ha registrat cap acció.",
  "{n} cuentas editoras en la plataforma.":
    "{n} comptes editors a la plataforma.",
  "1 cuenta editora en la plataforma.":
    "1 compte editor a la plataforma.",
  Sistema: "Sistema",

  // Panel: libros
  "Libros del catálogo": "Llibres del catàleg",
  "{n} títulos para “{query}”": "{n} títols per a “{query}”",
  "Buscar en el fondo": "Cerca al fons",
  "Título, autoría o ISBN… ": "Títol, autoria o ISBN… ",
  "No hay títulos que coincidan con esa búsqueda.":
    "No hi ha títols que coincideixin amb aquesta cerca.",
  "Añade el primer libro para empezar a construir el catálogo.":
    "Afegeix el primer llibre per començar a construir el catàleg.",
  Acciones: "Accions",
  "Ubic.": "Ubic.",
  Actualizado: "Actualitzat",
  Editar: "Edita",
  "El libro se ha añadido al catálogo.": "El llibre s'ha afegit al catàleg.",
  "Los cambios se han guardado.": "Els canvis s'han desat.",
  "Añadir un libro": "Afegeix un llibre",
  "Los campos marcados con ": "Els camps marcats amb ",
  " son obligatorios. El libro aparecerá en el catálogo en cuanto lo guardes.":
    " són obligatoris. El llibre apareixerà al catàleg tan bon punt el desis.",
  "Editar la ficha": "Edita la fitxa",
  "Modifica los datos y guarda los cambios.":
    "Modifica les dades i desa els canvis.",
  "Ver en el catálogo": "Veure al catàleg",
  "Editar libro": "Edita el llibre",
  Cancelar: "Cancel·la",
  "Guardar cambios": "Desa els canvis",

  // Formulario de libro
  "Datos principales": "Dades principals",
  Título: "Títol",
  "Autoría ": "Autoria ",
  "Edición y ejemplares": "Edició i exemplars",
  "Año de publicación": "Any de publicació",
  ISBN: "ISBN",
  "Número de páginas": "Nombre de pàgines",
  "Ubicación en la estantería": "Ubicació al prestatge",
  "Por ejemplo: N-01, REF-03…": "Per exemple: N-01, REF-03…",
  "Etiquetas / materias": "Etiquetes / matèries",
  "Sepáralas con comas. Por ejemplo: Novela negra, Lectura recomendada, Val d'Aran":
    "Separa-les amb comes. Per exemple: Novel·la negra, Lectura recomanada, Val d'Aran",
  "Aventuras, Clásicos…": "Aventures, Clàssics…",
  "Guardando…": "Desant…",
  "Añadir libro ": "Afegeix el llibre ",
  "Guardar de todas formas": "Desa-ho igualment",
  "Ver la ficha existente": "Veure la fitxa existent",
  ". Si aun así quieres registrarlo, vuelve a guardar.":
    ". Si tot i així el vols registrar, torna a desar.",
  "Revisa los campos marcados antes de guardar.":
    "Revisa els camps marcats abans de desar.",

  // Panel: lectores
  "Lectores y lectoras": "Lectors i lectores",
  "Personas que pueden llevarse libros en préstamo. No necesitan cuenta: el personal registra sus préstamos y reservas desde aquí.":
    "Persones que poden emportar-se llibres en préstec. No necessiten compte: el personal registra els seus préstecs i reserves des d'aquí.",
  "El lector o lectora se ha dado de alta.":
    "El lector o lectora s'ha donat d'alta.",
  "Dar de alta un lector o lectora": "Donar d'alta un lector o lectora",
  Listado: "Llistat",
  "1 persona": "1 persona",
  "{n} personas": "{n} persones",
  "Nombre, carné o grupo…": "Nom, carnet o grup…",
  "Aún no hay lectores": "Encara no hi ha lectors",
  "No hay personas que coincidan con esa búsqueda.":
    "No hi ha persones que coincideixin amb aquesta cerca.",
  "Da de alta al primer lector o lectora para empezar a registrar préstamos.":
    "Dona d'alta el primer lector o lectora per començar a registrar préstecs.",
  Persona: "Persona",
  Carné: "Carnet",
  Grupo: "Grup",
  "En préstamo ": "En préstec ",
  Estado: "Estat",
  Activo: "Actiu",
  Baja: "Baixa",
  "Ver ficha": "Veure la fitxa",
  Activar: "Activa",
  Desactivar: "Desactiva",
  "Ficha del lector": "Fitxa del lector",
  "Datos de la persona": "Dades de la persona",
  "Préstamos en curso ({n})": "Préstecs en curs ({n})",
  "Esta persona no tiene préstamos activos.":
    "Aquesta persona no té préstecs actius.",
  Libro: "Llibre",
  Prestado: "Prestat",
  "Devolver antes de": "Retornar abans de",
  Devolver: "Retorna",
  Devuelto: "Retornat",
  " (vencido)": " (vençut)",
  "Reservas pendientes ({n})": "Reserves pendents ({n})",
  "Sin reservas pendientes.": "Sense reserves pendents.",
  "Reservado el {date}": "Reservat el {date}",
  Historial: "Historial",
  "· devuelto": "· retornat",
  "· reserva {status}": "· reserva {status}",
  "Dado de baja": "Donat de baixa",
  "Sin datos de contacto": "Sense dades de contacte",
  "Carné {card}": "Carnet {card}",
  "Nombre y apellidos": "Nom i cognoms",
  "Número de carné": "Número de carnet",
  "Curso o grupo": "Curs o grup",
  "Correo electrónico": "Correu electrònic",
  Teléfono: "Telèfon",
  Notas: "Notes",
  "Dar de alta": "Dona d'alta",
  "Volver al listado": "Torna al llistat",
  Opcional: "Opcional",

  // Préstamos
  "1 préstamo en curso": "1 préstec en curs",
  "{n} préstamos en curso": "{n} préstecs en curs",
  " · {n} vencidos": " · {n} vençuts",
  "El préstamo se ha registrado.": "El préstec s'ha registrat.",
  Vencidos: "Vençuts",
  Devueltos: "Retornats",
  Todos: "Tots",
  "Sin préstamos": "Sense préstecs",
  "Ahora mismo no hay ningún préstamo vencido. ¡Buen trabajo!":
    "Ara mateix no hi ha cap préstec vençut. Bona feina!",
  "Todavía no se ha registrado ninguna devolución.":
    "Encara no s'ha registrat cap devolució.",
  "No hay préstamos en este momento. Registra uno para empezar.":
    "No hi ha préstecs en aquest moment. Registra'n un per començar.",
  "Registrar un préstamo": "Registra un préstec",
  "Elige el libro, la persona que se lo lleva y hasta cuándo puede tenerlo. Los ejemplares disponibles se ajustan solos.":
    "Tria el llibre, la persona que se l'emporta i fins quan el pot tenir. Els exemplars disponibles s'ajusten sols.",
  "No hay libros": "No hi ha llibres",
  "No hay lectores": "No hi ha lectors",
  "Antes de registrar un préstamo necesitas tener algún libro en el catálogo.":
    "Abans de registrar un préstec necessites tenir algun llibre al catàleg.",
  "Antes de registrar un préstamo necesitas dar de alta al menos un lector o lectora.":
    "Abans de registrar un préstec necessites donar d'alta almenys un lector o lectora.",
  "Añadir lector": "Afegeix lector",
  "Selecciona un libro…": "Selecciona un llibre…",
  "Selecciona una persona…": "Selecciona una persona…",
  "Lector o lectora": "Lector o lectora",
  "Fecha de devolución": "Data de retorn",
  "Día en que debe volver el ejemplar.": "Dia en què ha de tornar l'exemplar.",
  "Estado del ejemplar, incidencias…": "Estat de l'exemplar, incidències…",
  "Registrando…": "Registrant…",
  "Registrar préstamo ": "Registra el préstec ",
  "+{days} días": "+{days} dies",
  "Préstamo prorrogado.": "Préstec prorrogat.",

  // Reservas
  "Libros que el alumnado o el profesorado quieren pedir prestados y que ahora mismo no están disponibles. Cuando quieras, puedes servir una reserva para convertirla en préstamo.":
    "Llibres que l'alumnat o el professorat volen demanar en préstec i que ara mateix no estan disponibles. Quan vulguis, pots servir una reserva per convertir-la en préstec.",
  "La reserva se ha creado.": "La reserva s'ha creat.",
  "Crear una reserva": "Crea una reserva",
  "Necesitas tener algún libro en el catálogo y algún lector dado de alta.":
    "Necessites tenir algun llibre al catàleg i algun lector donat d'alta.",
  "Reservas pendientes ": "Reserves pendents ",
  "Sin reservas pendientes": "Sense reserves pendents",
  "Cuando alguien reserve un libro que está prestado, aparecerá aquí.":
    "Quan algú reservi un llibre que està prestat, apareixerà aquí.",
  "Fijada el": "Fixada el",
  Servir: "Serveix",
  Anular: "Anul·la",
  Anulada: "Anul·lada",
  "Reservas resueltas": "Reserves resoltes",
  "Crear reserva": "Crea la reserva",
  Pendiente: "Pendent",
  Servida: "Servida",
  "Préstamo registrado para {name}.": "Préstec registrat per a {name}.",
  "Reserva anulada.": "Reserva anul·lada.",

  // Usuarios
  "Usuarios de la plataforma": "Usuaris de la plataforma",
  "Solo el dueño puede crear cuentas. Cada cuenta creada aquí puede iniciar sesión y añadir o editar libros en el catálogo.":
    "Només el propietari pot crear comptes. Cada compte creat aquí pot iniciar sessió i afegir o editar llibres al catàleg.",
  "Crear una cuenta": "Crea un compte",
  "La persona deberá cambiar la contraseña la primera vez que entre.":
    "La persona haurà de canviar la contrasenya la primera vegada que entri.",
  "Cuentas ({n})": "Comptes ({n})",
  "1 activa": "1 activa",
  "{n} activas": "{n} actives",
  "Cuentas de la plataforma": "Comptes de la plataforma",
  Rol: "Rol",
  "Último acceso": "Darrer accés",
  "tú": "tu",
  "Creada por {name}": "Creada per {name}",
  Dueño_: "Propietari",
  Activa: "Activa",
  Desactivada: "Desactivada",
  Nunca: "Mai",
  "Alta: {date}": "Alta: {date}",
  "Contraseña provisional": "Contrasenya provisional",
  "Letras, números, punto, guion y guion bajo.":
    "Lletres, números, punt, guió i guió baix.",
  "Mínimo 8 caracteres. La persona deberá cambiarla al entrar.":
    "Mínim 8 caràcters. La persona l'haurà de canviar en entrar.",
  "Creando…": "Creant…",
  "Crear cuenta": "Crea el compte",
  Contraseña_: "Contrasenya",
  "Nueva contraseña": "Contrasenya nova",
  Asignar: "Assigna",
  "¿Eliminar?": "Eliminar?",
  Sí: "Sí",
  No: "No",
  Eliminar: "Elimina",
  "No puedes desactivar tu propia cuenta":
    "No pots desactivar el teu propi compte",
  "Nueva contraseña para {user}": "Contrasenya nova per a {user}",

  // Actividad
  "Historial de actividad": "Historial d'activitat",
  "Registro de las últimas {n} acciones realizadas en la plataforma: altas de libros, ediciones, borrados y gestión de cuentas.":
    "Registre de les últimes {n} accions fetes a la plataforma: altes de llibres, edicions, esborrats i gestió de comptes.",
  "Todavía no se ha registrado ninguna acción.":
    "Encara no s'ha registrat cap acció.",

  // Mi cuenta
  "Consulta tus datos y cambia tu contraseña.":
    "Consulta les teves dades i canvia la contrasenya.",
  Datos: "Dades",
  Nombre: "Nom",
  Usuario: "Usuari",
  Alta: "Alta",
  "Cambiar contraseña": "Canviar la contrasenya",
  "Tu contraseña es provisional. Cámbiala ahora.":
    "La teva contrasenya és provisional. Canvia-la ara.",
  "Introduce tu contraseña actual y la nueva.":
    "Introdueix la teva contrasenya actual i la nova.",
  "Contraseña actual": "Contrasenya actual",
  "Repite la nueva contraseña": "Repeteix la contrasenya nova",
  "Mínimo 8 caracteres.": "Mínim 8 caràcters.",
  "Actualizando…": "Actualitzant…",
  "Actualizar contraseña": "Actualitza la contrasenya",
  "Documentación": "Documentació",

  // Mensajes del sistema, del personal y de validación
  "Título, autoría, ISBN…": "Títol, autoria, ISBN…",
  "El panel de la": "El tauler de la",
  "en la plataforma.": "a la plataforma.",
  Cerrar: "Tanca",
  "Eliminar la cuenta {user}": "Elimina el compte {user}",
  "Secciones del panel": "Seccions del tauler",
  "Migas de pan": "Engrunes de pa",
  "Listado de libros del catálogo": "Llistat de llibres del catàleg",
  "Ej.": "Ex.",
  "para “{query}”": " per a “{query}”",
  "Revisa los datos introducidos.": "Revisa les dades introduïdes.",
  "Usuario o contraseña incorrectos.": "Usuari o contrasenya incorrectes.",
  "Esta cuenta está desactivada. Contacta con la dirección de la biblioteca.":
    "Aquest compte està desactivat. Contacta amb la direcció de la biblioteca.",
  "Tu sesión ha caducado. Vuelve a entrar.": "La teva sessió ha caducat. Torna a entrar.",
  "Revisa los campos marcados.": "Revisa els camps marcats.",
  "No se encontró tu cuenta.": "No s'ha trobat el teu compte.",
  "Contraseña actualizada correctamente.": "Contrasenya actualitzada correctament.",
  "Tu sesión ha caducado. Vuelve a iniciar sesión.":
    "La teva sessió ha caducat. Torna a iniciar sessió.",
  "No se ha indicado qué libro editar.": "No s'ha indicat quin llibre editar.",
  "El libro ya no existe.": "El llibre ja no existeix.",
  "Solo el dueño de la plataforma puede borrar libros.":
    "Només el propietari de la plataforma pot esborrar llibres.",
  "No se ha indicado qué libro borrar.": "No s'ha indicat quin llibre esborrar.",
  "La fecha de devolución no es válida.": "La data de devolució no és vàlida.",
  "Ese libro ya no existe.": "Aquest llibre ja no existeix.",
  "Ese lector ya no existe.": "Aquest lector ja no existeix.",
  "Ese lector está dado de baja.": "Aquest lector està donat de baixa.",
  "No se ha indicado el préstamo.": "No s'ha indicat el préstec.",
  "Ese préstamo ya no existe.": "Aquest préstec ja no existeix.",
  "Este préstamo ya estaba devuelto.": "Aquest préstec ja estava retornat.",
  "No se puede prorrogar un préstamo ya devuelto.":
    "No es pot prorrogar un préstec ja retornat.",
  "Ese lector ya tiene una reserva pendiente de este libro.":
    "Aquest lector ja té una reserva pendent d'aquest llibre.",
  "No se ha indicado la reserva.": "No s'ha indicat la reserva.",
  "Esa reserva ya no existe.": "Aquesta reserva ja no existeix.",
  "Esa reserva ya está resuelta.": "Aquesta reserva ja està resolta.",
  "Ya hay un lector o lectora con ese número de carné.":
    "Ja hi ha un lector o lectora amb aquest número de carnet.",
  "No se ha indicado qué lector editar.": "No s'ha indicat quin lector editar.",
  "No se ha indicado qué lector.": "No s'ha indicat quin lector.",
  "Solo el dueño de la plataforma puede gestionar usuarios.":
    "Només el propietari de la plataforma pot gestionar usuaris.",
  "Usuario no indicado.": "Usuari no indicat.",
  "El usuario ya no existe.": "L'usuari ja no existeix.",
  "No puedes eliminar tu propia cuenta.": "No pots eliminar el teu propi compte.",
  "No se puede eliminar una cuenta de dueño.":
    "No es pot eliminar un compte de propietari.",
  "Selecciona una categoría válida.": "Selecciona una categoria vàlida.",
  "El año debe estar entre 1000 y 2200.": "L'any ha d'estar entre 1000 i 2200.",
  "El número de páginas no es válido.": "El nombre de pàgines no és vàlid.",
  "Indica cuántos ejemplares hay.": "Indica quants exemplars hi ha.",
  "Las contraseñas no coinciden.": "Les contrasenyes no coincideixen.",
  "Acción": "Acció",
  " para “{query}”": " per a “{query}”",
  "Listado de lectores": "Llistat de lectors",
  "Listado de préstamos": "Llistat de préstecs",
  "Filtros de préstamos": "Filtres de préstecs",
  "Lector/a": "Lector/a",
  "No puedes desactivar tu propia cuenta.": "No pots desactivar el teu propi compte.",

  // Etiquetas de actividad, pestañas de estado y plurales
  "Libro añadido": "Llibre afegit",
  "Libro editado": "Llibre editat",
  "Libro eliminado": "Llibre eliminat",
  "Usuario creado": "Usuari creat",
  "Usuario actualizado": "Usuari actualitzat",
  "Usuario activado": "Usuari activat",
  "Usuario desactivado": "Usuari desactivat",
  "Contraseña restablecida": "Contrasenya restablerta",
  "Usuario eliminado": "Usuari eliminat",
  "Inicio de sesión": "Inici de sessió",
  "Cierre de sesión": "Tancament de sessió",
  "Lector/a dado de alta": "Lector/a donat d'alta",
  "Lector/a editado": "Lector/a editat",
  "Lector/a activado": "Lector/a activat",
  "Lector/a desactivado": "Lector/a desactivat",
  "Préstamo registrado": "Préstec registrat",
  "Devolución registrada": "Devolució registrada",
  "Préstamo prorrogado": "Préstec prorrogat",
  "Reserva creada": "Reserva creada",
  "Reserva anulada": "Reserva anulada",
  "Reserva servida": "Reserva servida",
  "En curso": "En curs",
  "cuenta editora": "compte editor",
  "cuentas editoras": "comptes editors",

  // Colecciones
  "Colecciones": "Col·leccions",
  "Colección": "Col·lecció",
  "Listas curadas": "Llistes curades",
  "Lista no encontrada": "Llista no trobada",
  "1 libro": "1 llibre",
  "{n} libros": "{n} llibres",
  "Esta lista todavía no tiene libros.": "Aquesta llista encara no té llibres.",
  "Ver todo el catálogo": "Veure tot el catàleg",
  "Listas preparadas por la biblioteca": "Llistes preparades per la biblioteca",
  "Selecciones que cambian con el curso: novedades, recomendados, el club de lectura y más.":
    "Seleccions que canvien amb el curs: novetats, recomanats, el club de lectura i més.",
  "Todavía no hay listas publicadas.": "Encara no hi ha llistes publicades.",
  "Ver la lista": "Veure la llista",
  "Ver todas las listas": "Veure totes les llistes",
  "Todavía no hay listas": "Encara no hi ha llistes",
  "Crea la primera lista con el formulario de abajo.":
    "Crea la primera llista amb el formulari de sota.",
  "Gestionar": "Gestionar",
  "Nueva lista": "Llista nova",
  "Le daremos automáticamente un enlace con el nombre de la lista.":
    "Li donarem automàticament un enllaç amb el nom de la llista.",
  "Agrupa los libros a mano para destacarlos: novedades, recomendados, club de lectura…":
    "Agrupa els llibres a mà per destacar-los: novetats, recomanats, club de lectura…",
  "1 libro en la lista": "1 llibre a la llista",
  "{n} libros en la lista": "{n} llibres a la llista",
  "Datos de la lista": "Dades de la llista",
  "Buscar libros para añadir": "Buscar llibres per afegir",
  "Título o autoría": "Títol o autoria",
  "Buscar en el catálogo…": "Buscar al catàleg…",
  "No hay más libros que coincidan con esa búsqueda.":
    "No hi ha més llibres que coincideixin amb aquesta cerca.",
  "Añadir a la lista": "Afegir a la llista",
  "Escribe un título o una autoría para buscar en el catálogo.":
    "Escriu un títol o una autoria per buscar al catàleg.",
  "La lista está vacía": "La llista és buida",
  "Busca libros arriba para ir añadiéndolos a la lista.":
    "Busca llibres a dalt per anar-los afegint a la llista.",
  "Subir «{title}»": "Pujar «{title}»",
  "Bajar «{title}»": "Baixar «{title}»",
  "Quitar": "Treure",
  "Registro": "Registre",
  "Nombre de la lista": "Nom de la llista",
  "Opcional. Aparece bajo el título en la página pública.":
    "Opcional. Apareix sota el títol a la pàgina pública.",
  "Lista creada": "Llista creada",
  "Lista editada": "Llista editada",
  "Lista eliminada": "Llista eliminada",
  "No se ha indicado qué lista editar.": "No s'ha indicat quina llista editar.",
  "La lista ya no existe.": "La llista ja no existeix.",
  "Solo el dueño de la plataforma puede borrar listas.":
    "Només el propietari de la plataforma pot esborrar llistes.",
  "No se ha indicado qué lista borrar.": "No s'ha indicat quina llista esborrar.",
  "Borrar lista": "Esborrar llista",
  "Crear lista": "Crear llista",
  "Novedades, Club de lectura…": "Novetats, Club de lectura…",

  // Bandeja de tareas
  "Tareas": "Tasques",
  "Bandeja de tareas": "Safata de tasques",
  "Todo lo que requiere tu atención hoy, en una sola página.":
    "Tot el que requereix la teva atenció avui, en una sola pàgina.",
  "No hay nada pendiente. ¡Buen trabajo!": "No hi ha res pendent. Bona feina!",
  "Préstamos vencidos": "Préstecs vençuts",
  "Devoluciones que ya deberían haber llegado.":
    "Devolucions que ja haurien d'haver arribat.",
  "No hay préstamos vencidos.": "No hi ha préstecs vençuts.",
  "1 día": "1 dia",
  "{n} días": "{n} dies",
  "Vencen hoy": "Venç avui",
  "Toca devolverlas hoy mismo.": "Cal tornar-les avui mateix.",
  "Hoy no vence ningún préstamo.": "Avui no venç cap préstec.",
  "Reservas por servir": "Reserves per servir",
  "Libros reservados por lectores y lectoras.": "Llibres reservats per lectors i lectores.",
  "No hay reservas pendientes.": "No hi ha reserves pendents.",
  "Sin ejemplares disponibles": "Sense exemplars disponibles",
  "Todos sus ejemplares están prestados.": "Tots els seus exemplars estan prestats.",
  "Todos los libros tienen algún ejemplar libre.":
    "Tots els llibres tenen algun exemplar lliure.",
  "{n} prestados de {total}": "{n} prestats de {total}",
  "Ver la ficha": "Veure la fitxa",

  // Portadas, registro y CDU
  "Portada": "Portada",
  "Dirección de la portada": "Adreça de la portada",
  "Déjala vacía para usar la portada tipográfica generada con el título.":
    "Deixa-la buida per fer servir la portada tipogràfica generada amb el títol.",
  "Buscar la portada automáticamente": "Buscar la portada automàticament",
  "Se busca por ISBN o por título y autoría al guardar.":
    "Es busca per ISBN o per títol i autoria en guardar.",
  "La portada debe venir de covers.openlibrary.org.":
    "La portada ha de venir de covers.openlibrary.org.",
  "N.º de registro": "N.º de registre",
  "CDU": "CDU",
  "Número de registro": "Número de registre",
  "El número de inventario. Se usa en las cuentas anuales.":
    "El número d'inventari. Es fa servir als comptes anuals.",
  "Clasificación Decimal Universal. Por ejemplo: 821.134.2-3":
    "Classificació Decimal Universal. Per exemple: 821.134.2-3",
};

/** Aranés. */
const ar: Messages = {
  Catálogo: "Catalòg",
  Autorías: "Autorias",
  Materias: "Matèries",
  Panel: "Panèu",
  Salir: "Sortir",
  Acceder: "Accedir",
  Inicio: "Inici",
  "Sesión iniciada como {user}": "Session iniciada coma {user}",
  Dueño: "Proprietari",
  Editor: "Editor",
  "Gestión del fondo bibliográfico": "Gestion deth hons bibliografic",
  "Plataforma interna · {year}": "Plataforma interna · {year}",
  "Saltar al contenido": "Và as contengut",
  Anterior: "Anterior",
  Siguiente: "Seguent",
  Borrado: "Suprimit",
  Borrar: "Suprimir",
  "Borrar «{title}»": "Suprimir «{title}»",
  "¿Seguro?": "Segur?",
  "Sí, borrar": "Òc, suprimir",
  "Confirmar borrado": "Confirmar era supression",

  "Fondo bibliográfico · {institution}": "Hons bibliografic · {institution}",
  "Consulta el catálogo completo del centro, filtra por categoría o autoría y comprueba la disponibilidad de cada ejemplar. El personal con cuenta puede incorporar nuevos títulos al fondo.":
    "Consulta eth catalòg complèt deth centre, filtra per categoria o autoria e comprova era disponibilitat de cada exemplar. Eth personau damb compde pòt incorporar nòus títols ath hons.",
  "Buscar en el catálogo": "Cercar en catalòg",
  "Título, autoría o ISBN…": "Títol, autoria o ISBN…",
  Buscar: "Cercar",
  "¿Gestionas el fondo?": "Gestiones eth hons?",
  "Accede con tu cuenta": "Accedís damb eth teu compde",
  "para añadir libros.": "entà apondre libres.",
  Títulos: "Títols",
  Ejemplares: "Exemplars",
  Categorías: "Categorias",
  Acceso: "Access",
  Público: "Public",
  "para consultar": "entà consultar",
  "Recién incorporados": "Recent incorporats",
  "Novedades del fondo": "Novetats deth hons",
  "Ver catálogo completo": "Veir eth catalòg complèt",
  "El catálogo todavía está vacío": "Eth catalòg enqüèra ei vuèg",
  "Cuando se añada el primer libro aparecerá aquí. El personal puede incorporar títulos desde el panel.":
    "Quan s'apondi eth prumèr libre apareisserà ací. Eth personau pòt incorporar títols des deth panèu.",
  "Acceder al panel": "Accedir ath panèu",
  "Explora el fondo": "Explora eth hons",
  "Por categoría": "Per categoria",

  "Todo el fondo": "Tot eth hons",
  "Resultados de “{query}”": "Resultats de “{query}”",
  "Materia: {tag}": "Matèria: {tag}",
  "1 título": "1 títol",
  "{n} títulos": "{n} títols",
  " con los filtros aplicados": " damb es filtri aplicats",
  " en la colección": " ena colleccion",
  Búsqueda: "Cèrca",
  Materia: "Matèria",
  "Ordenar por": "Ordenar per",
  "Incorporación reciente": "Incorporacion recenta",
  "Título (A–Z)": "Títol (A–Z)",
  "Autoría (A–Z)": "Autoria (A–Z)",
  "Más ejemplares": "Mès exemplars",
  Filtrar: "Filtrar",
  Limpiar: "Netejar",
  Todas: "Totes",
  "Sin resultados": "Sense resultats",
  "No se ha encontrado ningún título con esos criterios. Prueba a quitar algún filtro o a buscar de otra forma.":
    "Non s'a trobat cap títol damb aguesti critèris. Prova de quitar quauque filtre o de cercar d'auta manèra.",
  "Aún no hay libros": "Enqüèra i a pas libres",
  "El catálogo todavía no tiene títulos registrados.":
    "Eth catalòg enqüèra a pas títols registrats.",
  "Quitar filtros": "Quitar es filtri",
  "Novela negra…": "Novèla negra…",

  Disponibilidad: "Disponibilitat",
  "{available} de {total} ejemplares": "{available} de {total} exemplars",
  "1 disponible para préstamo": "1 disponible entà prestec",
  "{n} disponibles para préstamo": "{n} disponibles entà prestec",
  "Todos los ejemplares están prestados": "Tots es exemplars son prestats",
  "1 reserva pendiente": "1 reserva pendenta",
  "{n} reservas pendientes": "{n} reserves pendentes",
  Estantería: "Estantariá",
  "Editar ficha": "Editar era fitxa",
  Prestar: "Prestar",
  Reseña: "Recension",
  Ficha: "Fitxa",
  Categoría: "Categoria",
  Idioma: "Lengua",
  Editorial: "Editorial",
  Año: "An",
  Páginas: "Paginas",
  Ubicación: "Emplaçament",
  "Incorporado el {date}{by}.": "Incorporat eth {date}{by}.",
  " por {name}": " per {name}",
  "Última edición el {date} por {name}.":
    "Darrièra edicion eth {date} per {name}.",
  "Más de {category}": "Mès de {category}",
  "Ver todo": "Veir tot",
  "Libro no encontrado": "Libre non trobat",
  "Sin ejemplares": "Sense exemplars",
  "{available} de {copies} disp.": "{available} de {copies} disp.",
  "{copies} ej.": "{copies} ex.",

  "Quién escribe en la biblioteca": "Qui escriu ena bibliotèca",
  "1 autoría": "1 autoria",
  "{n} autorías": "{n} autorias",
  "Las autorías se crean solas a partir de los libros del catálogo: al registrar un libro nuevo, su autoría aparece aquí automáticamente.":
    "Es autorias se crèen soletes a partir des libres deth catalòg: en registrar un libre nòu, era sua autoria apareish ací automaticament.",
  "Todavía no hay autorías registradas.":
    "Enqüèra i a pas autorias registrades.",
  "{n} títulos en el catálogo": "{n} títols en catalòg",
  "1 título en el catálogo": "1 títol en catalòg",
  Autoría: "Autoria",
  "en el catálogo": "en catalòg",

  "Etiquetas del catálogo": "Etiquetas deth catalòg",
  "1 etiqueta": "1 etiqueta",
  "{n} etiquetas": "{n} etiquetas",
  "Materias libres que el personal añade a cada libro. El tamaño indica cuántos títulos llevan la etiqueta.":
    "Matèries liures qu'eth personau apone a cada libre. Era mesura indica quants títols pòrten era etiqueta.",
  "Todavía no hay etiquetas. Puedes añadirlas al registrar o editar un libro.":
    "Enqüèra i a pas etiquetas. Les pòdes apondre en registrar o editar un libre.",

  "Acceso restringido": "Access restrenhut",
  "El panel de la ": "Eth panèu dera ",
  "biblioteca.": "bibliotèca.",
  "La consulta del catálogo es pública. Para incorporar o editar títulos hace falta una cuenta que la dirección del centro haya creado previamente.":
    "Era consulta deth catalòg ei publica. Entà incorporar o editar títols cau un compde que era direccion deth centre age creat deuant.",
  "Entra con tu usuario y contraseña.": "Intra damb eth teu usuari e contrassenh.",
  "Añade libros desde el panel.": "Apone libres des deth panèu.",
  "Aparecerán al instante en el catálogo.": "Apareisheràn ath instant en catalòg.",
  "Iniciar sesión": "Iniciar session",
  "¿Necesitas una cuenta? Solo la dirección de la biblioteca puede crearlas desde su panel.":
    "As besonh d'un compde? Sonque era direccion dera bibliotèca les pòt crear des deth sòn panèu.",
  "Nombre de usuario": "Nom d'usuari",
  Contraseña: "Contrassenh",
  Entrar: "Intrar",
  "Entrando…": "Intrant…",

  "No hemos encontrado esta página": "Non em trobat aguesta pagina",
  "Puede que el enlace esté mal escrito o que el libro ya no esté en el catálogo.":
    "Pòt èster que eth ligam sige mau escriut o que eth libre non sige pas ath catalòg.",
  "Ir al catálogo": "Anar ath catalòg",
  "Volver al inicio": "Tornar ath inici",
  "Algo no ha funcionado": "Quauquarren a pas foncionat",
  "Se ha producido un error inesperado. Vuelve a intentarlo; si el problema continúa, avisa a la persona responsable de la plataforma.":
    "S'a produsit un error inesperat. Tornar a ensajar; se eth problèma contunhe, avisar era persona responsabla dera plataforma.",
  "Ref. {digest}": "Ref. {digest}",
  Reintentar: "Tornar a ensajar",

  Resumen: "Resumit",
  Libros: "Libres",
  "Añadir libro": "Apondre un libre",
  Lectores: "Lectors",
  Préstamos: "Prestecs",
  Reservas: "Reserves",
  Usuarios: "Usuaris",
  Actividad: "Activitat",
  "Mi cuenta": "Eth mèn compde",
  "Panel de gestión": "Panèu de gestion",
  "Dueño de la plataforma": "Proprietari dera plataforma",

  "Libros distintos en el fondo": "Libres diferents ath hons",
  "Suma de copias físicas": "Soma de còpias fisiques",
  "En préstamo": "En prestec",
  "{n} vencidos": "{n} vencuts",
  "{n} vencido": "{n} vencut",
  "Reservas pendientes": "Reserves pendentes",
  "Libros esperando estar libres": "Libres esperant èster liures",
  "Lectores activos": "Lectors actius",
  "Personas con carné en vigor": "Persones damb carnet en vigor",
  "Usuarios editores": "Usuaris editors",
  "Tu rol": "Eth teu ròtle",
  "Cuentas además de la tuya": "Compdes a mai deth teu",
  "Puedes gestionar préstamos y libros": "Pòs gerir prestecs e libres",
  "Acciones rápidas": "Accions rapidas",
  "Registrar préstamo": "Registrar un prestec",
  "Ver vencidos ({n})": "Veir vencuts ({n})",
  "Gestionar usuarios": "Gerir usuaris",
  "Ver catálogo público": "Veir eth catalòg public",
  "Últimos cambios": "Darrièrs cambiaments",
  "Ver todos": "Veir tot",
  "Todavía no hay libros.": "Enqüèra i a pas libres.",
  "Añade el primero": "Apone eth prumèr",
  "Actividad reciente": "Activitat recenta",
  "El historial de actividad está disponible para la cuenta de dueño de la plataforma.":
    "Er istoric d'activitat ei disponible peth compde de proprietari dera plataforma.",
  "Aún no se ha registrado ninguna acción.":
    "Enqüèra s'a pas registrat cap accion.",
  "{n} cuentas editoras en la plataforma.":
    "{n} compdes editors ena plataforma.",
  "1 cuenta editora en la plataforma.":
    "1 compde editor ena plataforma.",
  Sistema: "Sistèma",

  "Libros del catálogo": "Libres deth catalòg",
  "{n} títulos para “{query}”": "{n} títols entà “{query}”",
  "Buscar en el fondo": "Cercar ath hons",
  "No hay títulos que coincidan con esa búsqueda.":
    "I a pas títols que coincidiscan damb aguesta cèrca.",
  "Añade el primer libro para empezar a construir el catálogo.":
    "Apone eth prumèr libre entà començar a bastir eth catalòg.",
  Acciones: "Accions",
  "Ubic.": "Empl.",
  Actualizado: "Actualizat",
  Editar: "Editar",
  "El libro se ha añadido al catálogo.": "Eth libre s'a apondut ath catalòg.",
  "Los cambios se han guardado.": "Es cambiaments s'an gardat.",
  "Añadir un libro": "Apondre un libre",
  " son obligatorios. El libro aparecerá en el catálogo en cuanto lo guardes.":
    " son obligatòris. Eth libre apareisserà ath catalòg autant lèu com eth gardes.",
  "Editar la ficha": "Editar era fitxa",
  "Modifica los datos y guarda los cambios.":
    "Modifica es dades e garda es cambiaments.",
  "Ver en el catálogo": "Veir ath catalòg",
  "Editar libro": "Editar eth libre",
  Cancelar: "Anullar",
  "Guardar cambios": "Gardar es cambiaments",

  "Datos principales": "Dades principaus",
  Título: "Títol",
  "Edición y ejemplares": "Edicion e exemplars",
  "Año de publicación": "An de publicacion",
  ISBN: "ISBN",
  "Número de páginas": "Nombre de paginas",
  "Ubicación en la estantería": "Emplaçament en estantariá",
  "Por ejemplo: N-01, REF-03…": "Per exemple: N-01, REF-03…",
  "Etiquetas / materias": "Etiquetas / matèries",
  "Sepáralas con comas. Por ejemplo: Novela negra, Lectura recomendada, Val d'Aran":
    "Separa-les damb comas. Per exemple: Novèla negra, Lectura recomanada, Val d'Aran",
  "Aventuras, Clásicos…": "Aventuras, Classics…",
  "Guardando…": "Gardant…",
  "Guardar de todas formas": "Gardar de totes manères",
  "Ver la ficha existente": "Veir era fitxa existenta",
  ". Si aun así quieres registrarlo, vuelve a guardar.":
    ". Se totun eth vòs registrar, torna a gardar.",
  "Revisa los campos marcados antes de guardar.":
    "Revís es camps marcats deuant de gardar.",

  "Lectores y lectoras": "Lectors e lectores",
  "Personas que pueden llevarse libros en préstamo. No necesitan cuenta: el personal registra sus préstamos y reservas desde aquí.":
    "Persones que pòden emportar-se libres en prestec. Non an besonh de compde: eth personau registre es sòns prestecs e reserves des d'ací.",
  "El lector o lectora se ha dado de alta.":
    "Eth lector o era lectora s'a donat d'auta.",
  "Dar de alta un lector o lectora": "Donar d'auta un lector o lectora",
  Listado: "Listat",
  "1 persona": "1 persona",
  "{n} personas": "{n} persones",
  "Nombre, carné o grupo…": "Nom, carnet o grop…",
  "Aún no hay lectores": "Enqüèra i a pas lectors",
  "No hay personas que coincidan con esa búsqueda.":
    "I a pas persones que coincidiscan damb aguesta cèrca.",
  "Da de alta al primer lector o lectora para empezar a registrar préstamos.":
    "Dona d'auta eth prumèr lector o lectora entà començar a registrar prestecs.",
  Persona: "Persona",
  Carné: "Carnet",
  Grupo: "Grop",
  Estado: "Estat",
  Activo: "Actiu",
  Baja: "Baisha",
  "Ver ficha": "Veir era fitxa",
  Activar: "Activar",
  Desactivar: "Desactivar",
  "Ficha del lector": "Fitxa deth lector",
  "Datos de la persona": "Dades dera persona",
  "Préstamos en curso ({n})": "Prestecs en cors ({n})",
  "Esta persona no tiene préstamos activos.":
    "Aquesta persona a pas prestecs actius.",
  Libro: "Libre",
  Prestado: "Prestat",
  "Devolver antes de": "Tornar deuant de",
  Devolver: "Tornar",
  Devuelto: "Tornat",
  " (vencido)": " (vencut)",
  "Reservas pendientes ({n})": "Reserves pendentes ({n})",
  "Sin reservas pendientes.": "Sense reserves pendentes.",
  "Reservado el {date}": "Reservat eth {date}",
  Historial: "Istoric",
  "· devuelto": "· tornat",
  "· reserva {status}": "· reserva {status}",
  "Dado de baja": "Donat de baisha",
  "Sin datos de contacto": "Sense dades de contacte",
  "Carné {card}": "Carnet {card}",
  "Nombre y apellidos": "Nom e conhoms",
  "Número de carné": "Numèro de carnet",
  "Curso o grupo": "Cors o grop",
  "Correo electrónico": "Corrèu electronic",
  Teléfono: "Telefòn",
  Notas: "Nòtas",
  "Dar de alta": "Donar d'auta",
  "Volver al listado": "Tornar ath listat",
  Opcional: "Opcionau",

  "1 préstamo en curso": "1 prestec en cors",
  "{n} préstamos en curso": "{n} prestecs en cors",
  " · {n} vencidos": " · {n} vencuts",
  "El préstamo se ha registrado.": "Eth prestec s'a registrat.",
  Vencidos: "Vencuts",
  Devueltos: "Tornats",
  Todos: "Tots",
  "Sin préstamos": "Sense prestecs",
  "Ahora mismo no hay ningún préstamo vencido. ¡Buen trabajo!":
    "Ara medish i a pas cap prestec vencut. Bona hèsta!",
  "Todavía no se ha registrado ninguna devolución.":
    "Enqüèra s'a pas registrat cap devolucion.",
  "No hay préstamos en este momento. Registra uno para empezar.":
    "I a pas prestecs en aguest moment. Registra'n un entà començar.",
  "Registrar un préstamo": "Registrar un prestec",
  "Elige el libro, la persona que se lo lleva y hasta cuándo puede tenerlo. Los ejemplares disponibles se ajustan solos.":
    "Escuèlh eth libre, era persona que se'u emporta e dinc a quan eth pòt tier. Es exemplars disponibles s'ajusten sols.",
  "No hay libros": "I a pas libres",
  "No hay lectores": "I a pas lectors",
  "Antes de registrar un préstamo necesitas tener algún libro en el catálogo.":
    "Deuant de registrar un prestec as besonh de tier quauque libre en catalòg.",
  "Antes de registrar un préstamo necesitas dar de alta al menos un lector o lectora.":
    "Deuant de registrar un prestec as besonh de donar d'auta ath mens un lector o lectora.",
  "Añadir lector": "Apondre lector",
  "Selecciona un libro…": "Selecciona un libre…",
  "Selecciona una persona…": "Selecciona ua persona…",
  "Lector o lectora": "Lector o lectora",
  "Fecha de devolución": "Data de devolucion",
  "Día en que debe volver el ejemplar.": "Dia en qu'eth exemplar a de tornar.",
  "Estado del ejemplar, incidencias…": "Estat der exemplar, incidéncies…",
  "Registrando…": "Registrant…",
  "+{days} días": "+{days} dies",
  "Préstamo prorrogado.": "Prestec prorrogat.",

  "Libros que el alumnado o el profesorado quieren pedir prestados y que ahora mismo no están disponibles. Cuando quieras, puedes servir una reserva para convertirla en préstamo.":
    "Libres qu'era alumnat o eth professorat vòlen demanar en prestec e qu'ara medish non son disponibles. Quan vògues, pòs servir ua reserva entà convertir-la en prestec.",
  "La reserva se ha creado.": "Era reserva s'a creat.",
  "Crear una reserva": "Crear ua reserva",
  "Necesitas tener algún libro en el catálogo y algún lector dado de alta.":
    "As besonh de tier quauque libre en catalòg e quauque lector donat d'auta.",
  "Sin reservas pendientes": "Sense reserves pendentes",
  "Cuando alguien reserve un libro que está prestado, aparecerá aquí.":
    "Quan quauqu'un resèrvi un libre qu'ei prestat, apareisherà ací.",
  "Fijada el": "Hetzada eth",
  Servir: "Servir",
  Anular: "Anullar",
  Anulada: "Anullada",
  "Reservas resueltas": "Reserves resoltes",
  "Crear reserva": "Crear era reserva",
  Pendiente: "Pendenta",
  Servida: "Servida",
  "Préstamo registrado para {name}.": "Prestec registrat entà {name}.",
  "Reserva anulada.": "Reserva anullada.",

  "Usuarios de la plataforma": "Usuaris dera plataforma",
  "Solo el dueño puede crear cuentas. Cada cuenta creada aquí puede iniciar sesión y añadir o editar libros en el catálogo.":
    "Sonque eth proprietari pòt crear compdes. Cada compde creat ací pòt iniciar session e apondre o editar libres en catalòg.",
  "Crear una cuenta": "Crear un compde",
  "La persona deberá cambiar la contraseña la primera vez que entre.":
    "Era persona aurà de cambiar eth contrassenh eth prumèr còp qu'intre.",
  "Cuentas ({n})": "Compdes ({n})",
  "1 activa": "1 activa",
  "{n} activas": "{n} actives",
  "Cuentas de la plataforma": "Compdes dera plataforma",
  Rol: "Ròtle",
  "Último acceso": "Darrièr access",
  "tú": "tu",
  "Creada por {name}": "Creat per {name}",
  Activa: "Activa",
  Desactivada: "Desactivada",
  Nunca: "Mai",
  "Alta: {date}": "Autada: {date}",
  "Contraseña provisional": "Contrassenh provisoriau",
  "Letras, números, punto, guion y guion bajo.":
    "Letres, numèros, punt, guion e guion baish.",
  "Mínimo 8 caracteres. La persona deberá cambiarla al entrar.":
    "Minimum 8 caractèrs. Era persona l'aurà de cambiar en intrar.",
  "Creando…": "Creant…",
  "Crear cuenta": "Crear eth compde",
  "Nueva contraseña": "Contrassenh nòu",
  Asignar: "Assignar",
  "¿Eliminar?": "Suprimir?",
  Sí: "Òc",
  No: "Non",
  Eliminar: "Suprimir",
  "No puedes desactivar tu propia cuenta":
    "Non pòs desactivar eth teu pròpri compde",
  "Nueva contraseña para {user}": "Contrassenh nòu entà {user}",

  "Historial de actividad": "Istoric d'activitat",
  "Registro de las últimas {n} acciones realizadas en la plataforma: altas de libros, ediciones, borrados y gestión de cuentas.":
    "Registre des darrières {n} accions hèites ena plataforma: autes de libres, edicions, supressions e gestion de compdes.",
  "Todavía no se ha registrado ninguna acción.":
    "Enqüèra s'a pas registrat cap accion.",

  "Consulta tus datos y cambia tu contraseña.":
    "Consulta es tues dades e cambia eth teu contrassenh.",
  Datos: "Dades",
  Nombre: "Nom",
  Usuario: "Usuari",
  Alta: "Autada",
  "Cambiar contraseña": "Cambiar eth contrassenh",
  "Tu contraseña es provisional. Cámbiala ahora.":
    "Eth teu contrassenh ei provisoriau. Cambia-lo ara.",
  "Introduce tu contraseña actual y la nueva.":
    "Introdusís eth teu contrassenh actuau e eth nòu.",
  "Contraseña actual": "Contrassenh actuau",
  "Repite la nueva contraseña": "Repetís eth contrassenh nòu",
  "Mínimo 8 caracteres.": "Minimum 8 caractèrs.",
  "Actualizando…": "Actualizant…",
  "Actualizar contraseña": "Actualizar eth contrassenh",

  // Missatges deth sistèma, deth personau e de validacion
  "Título, autoría, ISBN…": "Títol, autoria, ISBN…",
  "El panel de la": "Eth tauler dera",
  "en la plataforma.": "ara plataforma.",
  Cerrar: "Tampar",
  "Eliminar la cuenta {user}": "Suprimir eth compde {user}",
  "Secciones del panel": "Seccions deth tauler",
  "Migas de pan": "Camins de navegacion",
  "Listado de libros del catálogo": "Listat de libres deth catalòg",
  "Ej.": "Ex.",
  "para “{query}”": " per a “{query}”",
  "Revisa los datos introducidos.": "Rebisatz es donades introduïdes.",
  "Usuario o contraseña incorrectos.": "Usuari o contrasenh incorrèctes.",
  "Esta cuenta está desactivada. Contacta con la dirección de la biblioteca.":
    "Agust compde ei desactivat. Contactatz damb era direccion dera bibliotèca.",
  "Tu sesión ha caducado. Vuelve a entrar.": "Era tua session a caducat. Tornatz a entrar.",
  "Revisa los campos marcados.": "Rebisatz es camps marcats.",
  "No se encontró tu cuenta.": "Non s'a trobat eth teu compde.",
  "Contraseña actualizada correctamente.": "Contrasenh actualizat corrèctament.",
  "Tu sesión ha caducado. Vuelve a iniciar sesión.":
    "Era tua session a caducat. Tornatz a iniciar session.",
  "No se ha indicado qué libro editar.": "Non s'a indicat quin libre editar.",
  "El libro ya no existe.": "Eth libre ja non existís.",
  "Solo el dueño de la plataforma puede borrar libros.":
    "Sonque eth propietari dera plataforma pòt suprimir libres.",
  "No se ha indicado qué libro borrar.": "Non s'a indicat quin libre suprimir.",
  "La fecha de devolución no es válida.": "Era data de deute non ei valida.",
  "Ese libro ya no existe.": "Agust libre ja non existís.",
  "Ese lector ya no existe.": "Agust lector ja non existís.",
  "Ese lector está dado de baja.": "Agust lector ei donat de baisha.",
  "No se ha indicado el préstamo.": "Non s'a indicat eth prèstec.",
  "Ese préstamo ya no existe.": "Agust prèstec ja non existís.",
  "Este préstamo ya estaba devuelto.": "Agust prèstec ja ère tornat.",
  "No se puede prorrogar un préstamo ya devuelto.":
    "Non se pòt prorrogar un prèstec ja tornat.",
  "Ese lector ya tiene una reserva pendiente de este libro.":
    "Agust lector ja a ua reserva pendenta d'agust libre.",
  "No se ha indicado la reserva.": "Non s'a indicat era reserva.",
  "Esa reserva ya no existe.": "Aguesta reserva ja non existís.",
  "Esa reserva ya está resuelta.": "Aguesta reserva ja ei resolguda.",
  "Ya hay un lector o lectora con ese número de carné.":
    "Ja i a un lector o lectritz damb aguest numèro de carnet.",
  "No se ha indicado qué lector editar.": "Non s'a indicat quin lector editar.",
  "No se ha indicado qué lector.": "Non s'a indicat quin lector.",
  "Solo el dueño de la plataforma puede gestionar usuarios.":
    "Sonque eth propietari dera plataforma pòt gerir usuaris.",
  "Usuario no indicado.": "Usuari non indicat.",
  "El usuario ya no existe.": "Er usuari ja non existís.",
  "No puedes eliminar tu propia cuenta.": "Non pòdes suprimir eth teu pròpri compde.",
  "No se puede eliminar una cuenta de dueño.":
    "Non se pòt suprimir un compde de propietari.",
  "Selecciona una categoría válida.": "Selecciona ua categoria valida.",
  "El año debe estar entre 1000 y 2200.": "Era anada a d'estar entre 1000 e 2200.",
  "El número de páginas no es válido.": "Eth nombre de paginas non ei valid.",
  "Indica cuántos ejemplares hay.": "Indica quants exemplars i a.",
  "Las contraseñas no coinciden.": "Es contrasenhs non coincidissen.",
  "Acción": "Accion",
  " para “{query}”": " per a “{query}”",
  "Listado de lectores": "Listat de lectors",
  "Listado de préstamos": "Listat de prèstecs",
  "Filtros de préstamos": "Filtres de prèstecs",
  "Lector/a": "Lector/a",
  "Los campos marcados con ": "Es camps marcats damb ",

  // Etiquetas de actividad, pestañas de estado y plurales
  "Libro añadido": "Libre apondut",
  "Libro editado": "Libre editat",
  "Libro eliminado": "Libre suprimit",
  "Usuario creado": "Usuari creat",
  "Usuario actualizado": "Usuari actualizat",
  "Usuario activado": "Usuari activat",
  "Usuario desactivado": "Usuari desactivat",
  "Contraseña restablecida": "Contrasenh restablit",
  "Usuario eliminado": "Usuari suprimit",
  "Inicio de sesión": "Inici de session",
  "Cierre de sesión": "Tancament de session",
  "Lector/a dado de alta": "Lector/a donat d'auta",
  "Lector/a editado": "Lector/a editat",
  "Lector/a activado": "Lector/a activat",
  "Lector/a desactivado": "Lector/a desactivat",
  "Préstamo registrado": "Prèstec registrat",
  "Devolución registrada": "Devolucion registrada",
  "Préstamo prorrogado": "Prèstec prorrogat",
  "Reserva creada": "Reserva creada",
  "Reserva anulada": "Reserva anulada",
  "Reserva servida": "Reserva servida",
  "En curso": "En cors",
  "cuenta editora": "compde editor",
  "cuentas editoras": "compdes editors",
  "No puedes desactivar tu propia cuenta.": "Non pòdes desactivar eth teu pròpri compde.",

  // Colleccions
  "Colecciones": "Colleccions",
  "Colección": "Colleccion",
  "Listas curadas": "Listes curades",
  "Lista no encontrada": "Lista pas trobada",
  "1 libro": "1 libre",
  "{n} libros": "{n} libres",
  "Esta lista todavía no tiene libros.": "Agera lista enqüèra non a libres.",
  "Ver todo el catálogo": "Veir tot eth catalòg",
  "Listas preparadas por la biblioteca": "Listes preparades pera bibliotèca",
  "Selecciones que cambian con el curso: novedades, recomendados, el club de lectura y más.":
    "Seleccions que cambien damb eth cors: novetats, recomanadi, eth club de lectura e mès.",
  "Todavía no hay listas publicadas.": "Enqüèra non i a listes publicades.",
  "Ver la lista": "Veir era lista",
  "Ver todas las listas": "Veir totes es listes",
  "Todavía no hay listas": "Enqüèra non i a listes",
  "Crea la primera lista con el formulario de abajo.":
    "Crea era prumèra lista damb eth formulari de baish.",
  "Gestionar": "Gestionar",
  "Nueva lista": "Lista nòua",
  "Le daremos automáticamente un enlace con el nombre de la lista.":
    "Li darem automaticament un ligam damb eth nom dera lista.",
  "Agrupa los libros a mano para destacarlos: novedades, recomendados, club de lectura…":
    "Agropa es libres a man entà destacar-les: novetats, recomanadi, club de lectura…",
  "1 libro en la lista": "1 libre ena lista",
  "{n} libros en la lista": "{n} libres ena lista",
  "Datos de la lista": "Dades dera lista",
  "Buscar libros para añadir": "Cercar libres entà apondre",
  "Título o autoría": "Títol o autoria",
  "Buscar en el catálogo…": "Cercar en eth catalòg…",
  "No hay más libros que coincidan con esa búsqueda.":
    "Non i a mès libres que coincidiscan damb aguesta cerca.",
  "Añadir a la lista": "Apondre ara lista",
  "Escribe un título o una autoría para buscar en el catálogo.":
    "Escriu un títol o ua autoria entà cercar en eth catalòg.",
  "La lista está vacía": "Era lista ei vueja",
  "Busca libros arriba para ir añadiéndolos a la lista.":
    "Cèrca libres ací dalt entà anar-les apondent ara lista.",
  "Subir «{title}»": "Pujar «{title}»",
  "Bajar «{title}»": "Baishar «{title}»",
  "Quitar": "Levar",
  "Registro": "Registre",
  "Nombre de la lista": "Nom dera lista",
  "Opcional. Aparece bajo el título en la página pública.":
    "Opcionau. Apareish baish eth títol ena pàgina publica.",
  "Lista creada": "Lista creada",
  "Lista editada": "Lista editada",
  "Lista eliminada": "Lista eliminada",
  "No se ha indicado qué lista editar.": "Non s'a indicat quina lista editar.",
  "La lista ya no existe.": "Era lista ja non existís.",
  "Solo el dueño de la plataforma puede borrar listas.":
    "Sonque eth proprietari dera plataforma pòt suprimir listes.",
  "No se ha indicado qué lista borrar.": "Non s'a indicat quina lista suprimir.",
  "Borrar lista": "Suprimir lista",
  "Crear lista": "Crear lista",
  "Novedades, Club de lectura…": "Novetats, Club de lectura…",

  // Safata de tàches
  "Tareas": "Tàches",
  "Bandeja de tareas": "Safata de tàches",
  "Todo lo que requiere tu atención hoy, en una sola página.":
    "Tot çò que requerís era tua atencion uei, en ua sola pàgina.",
  "No hay nada pendiente. ¡Buen trabajo!": "Non i a arren pendent. Bona hèita!",
  "Préstamos vencidos": "Prèstecs vençuts",
  "Devoluciones que ya deberían haber llegado.":
    "Devolucions que ja aurien d'aver arribat.",
  "No hay préstamos vencidos.": "Non i a prèstecs vençuts.",
  "1 día": "1 dia",
  "{n} días": "{n} dies",
  "Vencen hoy": "Vencen uei",
  "Toca devolverlas hoy mismo.": "Cau tornar-les uei madeish.",
  "Hoy no vence ningún préstamo.": "Uei non venc cap prèstec.",
  "Reservas por servir": "Reserves entà servir",
  "Libros reservados por lectores y lectoras.": "Libres reserves per lectors e lectores.",
  "No hay reservas pendientes.": "Non i a reserves pendentes.",
  "Sin ejemplares disponibles": "Sense exemplars disponibles",
  "Todos sus ejemplares están prestados.": "Toti es sons exemplars son prestats.",
  "Todos los libros tienen algún ejemplar libre.":
    "Toti es libres an quauque exemplar liure.",
  "{n} prestados de {total}": "{n} prestats de {total}",
  "Ver la ficha": "Veir era fitxa",

  // Portades, registre e CDU
  "Portada": "Portada",
  "Dirección de la portada": "Adreça dera portada",
  "Déjala vacía para usar la portada tipográfica generada con el título.":
    "Deisha-la vueja entà servir era portada tipografica generada damb eth títol.",
  "Buscar la portada automáticamente": "Cercar era portada automaticament",
  "Se busca por ISBN o por título y autoría al guardar.":
    "Se cèrca per ISBN o per títol e autoria en guardar.",
  "La portada debe venir de covers.openlibrary.org.":
    "Era portada a de víder de covers.openlibrary.org.",
  "N.º de registro": "N.° de registre",
  "CDU": "CDU",
  "Número de registro": "Numèro de registre",
  "El número de inventario. Se usa en las cuentas anuales.":
    "Eth numèro d'inventari. Se hè servir as compdes anuaus.",
  "Clasificación Decimal Universal. Por ejemplo: 821.134.2-3":
    "Classificacion Decimau Universau. Per exemple: 821.134.2-3",
};

export const MESSAGES: Record<Locale, Messages> = { es: {}, ca, ar };

/**
 * Mensajes que llevan datos variables (un título, un nombre, un plazo…).
 * Se reconocen por su forma en castellano, así que no hace falta cambiar el
 * código que los construye: basta con traducir la plantilla.
 */
export const DYNAMIC: Record<Locale, DynamicMessages> = {
  es: [],
  ca: [
    {
      source:
        "Demasiados intentos fallidos. Vuelve a intentarlo dentro de {minutes} minuto(s).",
      target:
        "Massa intents fallits. Torna-ho a provar d'aquí a {minutes} minut(s).",
    },
    {
      source: "Se ha borrado «{title}».",
      target: "S'ha esborrat «{title}».",
    },
    {
      source: "No quedan ejemplares disponibles de «{title}».",
      target: "No queden exemplars disponibles de «{title}».",
    },
    {
      source: "«{title}» marcado como devuelto.",
      target: "«{title}» marcat com a retornat.",
    },
    {
      source: "No hay ejemplares disponibles de «{title}» todavía.",
      target: "Encara no hi ha exemplars disponibles de «{title}».",
    },
    {
      source: "Préstamo registrado para {reader}.",
      target: "Préstec registrat per a {reader}.",
    },
    {
      source:
        "Cuenta «{username}» creada. La persona deberá cambiar la contraseña al entrar.",
      target:
        "Compte «{username}» creat. La persona haurà de canviar la contrasenya en entrar.",
    },
    {
      source: "Cuenta «{username}» activada.",
      target: "Compte «{username}» activat.",
    },
    {
      source: "Cuenta «{username}» desactivada.",
      target: "Compte «{username}» desactivat.",
    },
    {
      source: "Nueva contraseña asignada a «{username}». Deberá cambiarla al entrar.",
      target:
        "Contrasenya nova assignada a «{username}». L'haurà de canviar en entrar.",
    },
    {
      source: "Cuenta «{username}» eliminada.",
      target: "Compte «{username}» eliminat.",
    },
    {
      source:
        "Ya hay un libro en el catálogo con este mismo ISBN: «{title}» de {author}.",
      target:
        "Ja hi ha un llibre al catàleg amb aquest mateix ISBN: «{title}» de {author}.",
    },
    {
      source: "Ya hay un libro con el mismo título y autoría: «{title}» de {author}.",
      target:
        "Ja hi ha un llibre amb el mateix títol i autoria: «{title}» de {author}.",
    },
    {
      source: "{label} no puede superar los {max} caracteres.",
      target: "{label} no pot superar els {max} caràcters.",
    },
    {
      source: "Se ha guardado «{name}».",
      target: "S'ha desat «{name}».",
    },
  ],
  ar: [
    {
      source:
        "Demasiados intentos fallidos. Vuelve a intentarlo dentro de {minutes} minuto(s).",
      target:
        "Massi intents falhats. Tornatz a provar d'aquí a {minutes} minut(s).",
    },
    {
      source: "Se ha borrado «{title}».",
      target: "S'a suprimit «{title}».",
    },
    {
      source: "No quedan ejemplares disponibles de «{title}».",
      target: "Non demòran exemplars disponibles de «{title}».",
    },
    {
      source: "«{title}» marcado como devuelto.",
      target: "«{title}» marcat com a tornat.",
    },
    {
      source: "No hay ejemplares disponibles de «{title}» todavía.",
      target: "Enqüèra non i a exemplars disponibles de «{title}».",
    },
    {
      source: "Préstamo registrado para {reader}.",
      target: "Prèstec registrat tà {reader}.",
    },
    {
      source:
        "Cuenta «{username}» creada. La persona deberá cambiar la contraseña al entrar.",
      target:
        "Compde «{username}» creat. Era persona aurà de cambiar eth contrassenh en entrar.",
    },
    {
      source: "Cuenta «{username}» activada.",
      target: "Compde «{username}» activat.",
    },
    {
      source: "Cuenta «{username}» desactivada.",
      target: "Compde «{username}» desactivat.",
    },
    {
      source: "Nueva contraseña asignada a «{username}». Deberá cambiarla al entrar.",
      target:
        "Contrassenh nòu assignat a «{username}». L'aurà de cambiar en entrar.",
    },
    {
      source: "Cuenta «{username}» eliminada.",
      target: "Compde «{username}» suprimit.",
    },
    {
      source:
        "Ya hay un libro en el catálogo con este mismo ISBN: «{title}» de {author}.",
      target:
        "Ja i a un libre en eth catalòg damb aguest madeish ISBN: «{title}» de {author}.",
    },
    {
      source: "Ya hay un libro con el mismo título y autoría: «{title}» de {author}.",
      target:
        "Ja i a un libre damb eth madeish títol e autoria: «{title}» de {author}.",
    },
    {
      source: "{label} no puede superar los {max} caracteres.",
      target: "{label} non pòt superar es {max} caràcters.",
    },
    {
      source: "Se ha guardado «{name}».",
      target: "S'a desat «{name}».",
    },
  ],
};
