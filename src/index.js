import './scss/pts.lazyload.scss';
import PtsLazyLoad from './PtsLazyLoad.js';

// Сайты на v2.x создают экземпляр через new ptsLazyLoad(...)
if (typeof window !== 'undefined') {
    window.PtsLazyLoad = PtsLazyLoad;
    window.ptsLazyLoad = PtsLazyLoad;
}

export default PtsLazyLoad;
