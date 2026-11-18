import queryString from 'query-string';

import atrapaLaComida from './atrapa-la-comida';

const lessons = {
    [atrapaLaComida.id]: atrapaLaComida
};

/**
 * @returns {?object} the lesson named by the `?lesson=` URL parameter, if any
 */
const getActiveLesson = () => {
    const {lesson} = queryString.parse(location.search);
    return (typeof lesson === 'string' && Object.hasOwn(lessons, lesson)) ? lessons[lesson] : null;
};

export {getActiveLesson};
