function keepOnlyChangesInObject(obj1, obj2) {
    for (var key in obj1) {
        if (!obj1.hasOwnProperty(key)) {
            continue;
        }
        if (!(key in obj2) || typeof (obj1[key]) === "function") {
            delete obj1[key];
            continue;
        }
        if (typeof (obj1[key]) === "object" && obj1[key] !== null) {
            keepOnlyChangesInObject(obj1[key], obj2[key]);

        } else if (obj1[key] === obj2[key]) {
            delete obj1[key];
        }
    }
}

function removeEmptyObjects(obj) {
    for (var key in obj) {
        if (!obj.hasOwnProperty(key)) {
            continue;
        }
        if (typeof (obj[key]) === "object") {
            removeEmptyObjects(obj[key]);
            if (Object.keys(obj[key]).length === 0) {
                delete obj[key];
            }
        }
    }
}