import queryString from 'query-string';

import atrapaLaManzana from './atrapa-la-manzana';

const lessons = {
    [atrapaLaManzana.id]: atrapaLaManzana
};

/**
 * @returns {?object} the lesson named by the `?lesson=` URL parameter, if any
 */
const getActiveLesson = () => {
    const {lesson} = queryString.parse(location.search);
    return (typeof lesson === 'string' && Object.hasOwn(lessons, lesson)) ? lessons[lesson] : null;
};

export {getActiveLesson};
