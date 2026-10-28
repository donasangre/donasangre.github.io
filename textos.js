/* =====================================================================
   textos.js — TEXTOS EDITABLES DE LA PÁGINA
   - Cambia solo lo que va entre comillas o entre las comillas invertidas ` `.
   - Los campos que terminan en "HTML" admiten etiquetas: <p>, <strong>, <br>, <ul><li>, <a href="...">.
   - Si borras algún campo, la página usa un texto por defecto.
   ===================================================================== */

// Crea el objeto global de textos que lee app.js
window.TEXTOS = {

  // Título principal de la página (vacío = no se muestra; la pestaña usa tituloPestana)
  titulo: '',

  // Nombre de la pestaña del navegador cuando el título está vacío
  tituloPestana: 'Lo damos todo por la pública · Donación de sangre',

  // Banner superior. imagen: ruta de la imagen (p. ej. 'img/banner.jpg'); enlace: opcional
  //   - Si imagen está vacía, se ve un hueco gris; pon mostrarHueco: false para ocultarlo
  banner: { imagen: 'img/banner.jpg', enlace: '', alt: 'Banner', mostrarHueco: true },

  // Faldón inferior (mismas opciones que el banner)
  //   - La ruta es relativa a index.html: si la imagen está en la carpeta img, escribe 'img/faldon.jpg'
  faldon: { imagen: 'img/faldon.jpg', enlace: '', alt: 'Faldón', mostrarHueco: true },

  // Título de las instrucciones
  instruccionesTitulo: '',

  // Texto de las instrucciones (admite HTML)
  //   - <details>: bloque que se abre al pulsar; <summary> es la frase que se ve cerrada
  //   - <a data-whatsapp>: botón de compartir por WhatsApp (la web añade el enlace a esta página)
  instruccionesHTML: `
	<h1>Organízate como docente y ¡dona!</h1>

<p>
Desde la comunidad docente en huelga hemos organizado una donación colectiva de sangre que inicialmente estaba prevista para comenzar el 3 de noviembre, pero ante el trágico accidente ferroviario ocurrido en la provincia de Toledo, hemos considerado necesario adelantarla al miércoles 28 de octubre.
</p>
<p>
Hemos creado un sistema de registro según la capacidad de los puntos de donación para que todas las personas participen sin saturar los centros y distribuyendo las donaciones de forma escalonada. Esta planificación también es importante en el caso de la donación de plaquetas, que requiere donaciones recientes y distribuidas en el tiempo.
</p>
<p>
Importante: la información publicada en esta web se basa en datos facilitados por los hospitales contactados. No obstante, dado que estos centros no participan directamente en la gestión de la web, la información tiene carácter orientativo y puede contener errores o sufrir modificaciones. Por ello, ante cualquier duda, se recomienda confirmar horarios y condiciones de donación directamente con el hospital correspondiente. Más información <a href="#disclaimer">aquí</a>.
</p>
<p>
Animamos a aquellos docentes que participen a acudir con la camiseta verde para visibilizar esta acción y expresar nuestra solidaridad y nuestro compromiso con los servicios públicos y a mantener las donaciones a lo largo del tiempo. La disponibilidad de sangre y hemoderivados depende de la solidaridad sostenida de la población, por lo que es fundamental que las donaciones se realicen de forma siguiendo las indicaciones de los centros sanitarios, para mantener las reservas de los bancos de sangre.

</p>

	<h2>¿Cómo participar?</h2>
	<ol>
	  <li>Elige fecha, hospital y franja horaria.</li>
	  <li>Regístrate y anota tu número de reserva por si necesitas liberar tu plaza.</li>
	</ol>


    <details class="no-donar">
      <summary>Condiciones para donar. <em>(Pulsa para ver.)</em></summary>
      <h3>Para donar: </h3>
      <ul>
        <li>Tener entre 18 y 65 años y pesar más de 50 kg.</li>
        <li>Encontrarse en buen estado de salud.</li>
        <li>Acudir con un documento de identidad físico o digital.</li>
        <li>Haber ingerido algún alimento sólido en las 2-3 horas previas a la donación. No acudir en ayunas.</li>
      </ul>
      <h3> No es aconsejable donar si has hecho algo de lo siguiente en menos del tiempo indicado: </h3>
      <ul>
	<li>Donación de sangre: debe haber 2 meses entre donaciones.</li>	        
	<li>Tatuajes, piercings o acupuntura: 4 meses.</li>
        <li>Endoscopia o cirugía mayor: 4 meses.</li>
        <li>Cirugía menor (dermatológica o dental): 7 días.</li>
        <li>Antibióticos o infección reciente: 1 semana.</li>
        <li>Tratamiento con Proscar, Propecia o Roacután: 1 mes.</li>
        <li>Anemia demostrada: 4 meses.</li>
        <li>Embarazo: hasta 6 meses después del parto.</li>
        <li>Viajes al extranjero: al menos 28 días, según el país.</li>
        <li>Vacuna de la gripe: esperar 48 horas.</li>
	<li>De forma permanente:</strong> hepatitis B o C, sida, paludismo (malaria), tumores o enfermedad de Chagas.</li>
      </ul>
      <p>Ante cualquier duda, llama al teléfono gratuito <strong>900 30 35 30</strong> o consulta la
      <a href="https://www.comunidad.madrid/salud/donacion-sangre" target="_blank" rel="noopener">información de la Comunidad de Madrid</a>.</p>

    </details>

    <details class="no-donar">
      <summary id="disclaimer"><span style="color: #F47174;"> Esta web no es una herramienta de inscripción oficial de los hospitales.</span> <em>(Pulsa para ver.)</em></summary>
	
     <p> Esta web ha sido creada por docentes para facilitar la jornada averiguando y estimando cuánta gente pueden atender cada hora en cada centro. Eso implica que habrá errores o cambios durante el día que pueden afectar tu donación. 
<p>El resgistrarte aquí no te garantiza poder donar, pero sí facilita que la gente vaya de forma escalonada y más organizada. Por ello, si al final no pudieras donar, te pedimos disculpas y comprensión y te agradecemos tu apoyo. Tu esfuerzo es importante para visibilizar las condiciones educativas de Madrid. Y por favor, no te desanimes y <strong>dona cualquier otro día</strong>, pero no dejes de hacerlo. Las donaciones se necesitan de forma sostenida. Toda <strong>la Comunidad de Madrid te necesita.</strong> </p>
<p>Si eres un hospital y detectas algún error en plazas por hora, horarios, etc. Sentimos el error, pero por favor escribe a ml.tic.tecno@gmail.com desde tu cuenta oficial y cuéntanos qué debemos corregir.</p>	

    </details>

    <details class="no-donar">
      <summary>¿Por qué hacemos esto? </summary>
	<p> Esta es una iniciativa para realizar una donación colectiva de sangre en hospitales de gestión 100 % pública de la Comunidad de Madrid entre las docentes que estamos secundando la huelga indefinida que comenzó el 14 de octubre. Con esta iniciativa queremos mostrar a la sociedad que defender la educación pública es también defender los servicios públicos y el bienestar colectivo. </p>

<p> Desde aquí queremos expresar nuestro apoyo y reconocimiento a todas las profesionales de la salud, y hacer una meción especial a aquellas que luchan por hacer su trabajo de forma impecable pese a que las condiciones laborales y materiales no sean las más adecuadas. Apoyamos vuestra lucha. </p>

      <p><strong>¡Mientras luchamos por la educación pública, seguimos cuidando de lo común! ¡Anímate y difunde!</strong></p>

	<h3>¿Por qué solo estos hospitales?</h3>
      <p>En la Comunidad de Madrid conviven cinco modelos distintos de gestión hospitalaria, de los cuales solo uno corresponde a la gestión pública directa. Hemos decidido priorizar este modelo para la donación colectiva porque consideramos que la defensa de la sanidad pública pasa también por apoyar los centros cuya gestión depende directamente de la Administración pública. Consideramos importante que esta iniciativa solidaria, además de responder a la necesidad de donar sangre, sirva para visibilizar la importancia de defender una sanidad pública y universal. Estos son los modelos de gestión hospitalaria que encontramos en la Comunidad de Madrid:</p>
      <p>Desde entonces, coexisten en la red sanitaria madrileña distintos modelos de gestión:</p>
      <ul>
        <li><strong>Gestión pública directa:</strong> la Administración pública gestiona directamente la asistencia sanitaria y el hospital. Por ejemplo, el Hospital 12 de Octubre.</li>
        <li><strong>Modelo PFI:</strong> una empresa privada financia y construye el hospital y gestiona determinados servicios no sanitarios, como el mantenimiento o la limpieza, a cambio de un canon periódico que paga la Administración durante décadas. La asistencia sanitaria sigue siendo pública. Por ejemplo, el Hospital Infanta Sofía.</li>
        <li><strong>Concesión sanitaria:</strong> una empresa privada gestiona también la asistencia sanitaria, aunque esta se financie con fondos públicos. Por ejemplo, el Hospital Rey Juan Carlos.</li>
        <li><strong>Hospitales privados concertados:</strong> son centros de titularidad y gestión privada que tienen acuerdos con la Administración para atender a pacientes de la sanidad pública. Por ejemplo, la Fundación Jiménez Díaz.</li>
        <li><strong>Hospitales privados:</strong> titularidad y gestión privadas que atienden a pacientes privados, ya sea mediante seguros médicos o pagando directamente por la asistencia. A diferencia de los hospitales privados con concierto, no tienen un acuerdo para prestar asistencia financiada por el sistema público de salud.</li>
      </ul>
      <p>Por eso, hemos decidido realizar esta donación colectiva exclusivamente en hospitales de gestión pública directa, sin concesiones privadas de infraestructuras ni de gestión hospitalaria. Con esta acción queremos defender una sanidad pública y universal, así como una gestión pública de sus recursos, sin que su administración dependa de intereses empresariales.</p>
      <p><strong>Fuentes:</strong></p>
      <ul>
        <li><a href="https://cincodias.elpais.com/cincodias/2005/06/24/empresas/1119620386_850215.html" target="_blank" rel="noopener">Cinco Días (24/06/2005)</a></li>
        <li><a href="https://auditasanidad.org/hospitales/#1445522816065-dd9a8fe0-4f37" target="_blank" rel="noopener">Audita Sanidad: hospitales</a></li>
      </ul>
    </details>

   
  `,

  // Etiqueta de los hospitales destacados (las franjas de concentración se resaltan en la tabla)
  etiquetaDestacado: 'Este hospital tiene más capacidad o está en ¡maratón de donanción!',

  // Mensaje que acompaña al enlace al compartir por WhatsApp (se añade la dirección de la web al final)
  textoCompartir: 'Lo damos todo por la pública: donación de sangre de las docentes en huelga en hospitales 100 % públicos de Madrid. Elige hospital y hora aquí:',

  // Nota bajo el código de reserva en la pantalla final
  notaCodigo: 'Copia o apunta este código: lo necesitarás si quieres liberar tu plaza.',

  // Texto de la caja "Liberar mi espacio" (abajo, en las dos pantallas)
  textoLiberar: 'Si te has equivocado y quieres liberar tu espacio, escribe tu número de reserva y pulsa el botón "Liberar mi espacio".',

  // Aviso que se ve en las tablas cuando este navegador ya ha reservado
  avisoYaReservado: 'Ya has hecho tu reserva desde este navegador. Puedes consultar cómo va el registro, pero no es posible hacer otra reserva más desde aquí.',

  // Texto bajo el botón "Ver cómo va el registro" de la pantalla final
  notaVerRegistro: 'Solo podrás consultar las tablas: desde este navegador no se puede hacer otra reserva.',

  // Texto de la pantalla final si toda la reserva (o parte) ha quedado en lista de espera
  //   - {plaza}: personas con plaza; {espera}: personas en lista de espera
  textoEsperaParcial: 'De ellas: {plaza} con plaza y {espera} en lista de espera.',
  textoEsperaTotal: 'La franja estaba completa: estáis en lista de espera.',

  // Aviso importante de la pantalla final (admite HTML)
  importanteHTML: `
    <strong>Importante:</strong><br>
    Los horarios son orientativos. Esta convocatoria la organizamos de forma externa al hospital
    y está pensada para que nuestra acción sea visible, por lo que es posible que tengas que esperar
    más de lo previsto. Esta es una acción de la huelga: tu presencia y tu sangre son importantes.
    Si por cualquier motivo finalmente no pudieras donar o tuvieras que esperar más de la cuenta,
    te pedimos disculpas de antemano y te agradecemos profundamente tu tiempo.
  `,

  // Recuadro de totales generales (antes de la tabla): título y texto bajo cada cifra
  totalesTitulo: 'Así va la convocatoria',
  totalesEtiquetas: { total: 'personas apuntadas', plaza: 'con plaza', espera: 'en lista de espera' },

  // Mensaje cuando la zona elegida no tiene franjas ese día
  //   - Opcional: {zona} se sustituye por el nombre de la zona elegida (CAPITAL, NORTE…)
  textoZonaSinFranjas: 'No hay franjas disponibles para donar en esta zona y para esta fecha.',
};
