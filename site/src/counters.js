export const isMetrikaId = (id) => /^\d{5,12}$/.test(String(id).trim());
export const isGaId = (id) => /^G-[A-Z0-9]{4,16}$/i.test(String(id).trim());

/** Код счётчика в том виде, в каком его выдаёт интерфейс Метрики. */
export function metrikaSnippet(id, {webvisor = true, clickmap = true, trackLinks = true, accurateTrackBounce = true} = {}) {
    const params = [
        `clickmap:${clickmap}`,
        `trackLinks:${trackLinks}`,
        `accurateTrackBounce:${accurateTrackBounce}`,
        `webvisor:${webvisor}`,
    ].join(',\n        ');

    return `<!-- Yandex.Metrika counter -->
<script type="text/javascript">
   (function(m,e,t,r,i,k,a){m[i]=m[i]||function(){(m[i].a=m[i].a||[]).push(arguments)};
   m[i].l=1*new Date();
   for (var j = 0; j < document.scripts.length; j++) {if (document.scripts[j].src === r) { return; }}
   k=e.createElement(t),a=e.getElementsByTagName(t)[0],k.async=1,k.src=r,a.parentNode.insertBefore(k,a)})
   (window, document, "script", "https://mc.yandex.ru/metrika/tag.js", "ym");

   ym(${id}, "init", {
        ${params}
   });
</script>
<noscript><div><img src="https://mc.yandex.ru/watch/${id}" style="position:absolute; left:-9999px;" alt=""></div></noscript>
<!-- /Yandex.Metrika counter -->`;
}

/** Код Google tag (gtag.js) для Google Analytics 4. */
export function gaSnippet(id) {
    return `<!-- Google tag (gtag.js) -->
<script async src="https://www.googletagmanager.com/gtag/js?id=${id}"></script>
<script>
  window.dataLayer = window.dataLayer || [];
  function gtag(){dataLayer.push(arguments);}
  gtag('js', new Date());

  gtag('config', '${id}');
</script>`;
}

/** Коды счётчиков из состояния конструктора. Некорректные номера пропускаются. */
export function countersFromState(state) {
    const counters = [];
    const metrikaId = String(state.metrikaId || '').trim();
    const gaId = String(state.gaId || '').trim();

    if (isMetrikaId(metrikaId)) {
        counters.push(metrikaSnippet(metrikaId, {
            webvisor: state.metrikaWebvisor,
            clickmap: state.metrikaClickmap,
            trackLinks: state.metrikaTrackLinks,
            accurateTrackBounce: state.metrikaAccurateTrackBounce,
        }));
    }
    if (isGaId(gaId)) counters.push(gaSnippet(gaId.toUpperCase()));
    if (String(state.customCode || '').trim()) counters.push(String(state.customCode).trim());

    return counters;
}
