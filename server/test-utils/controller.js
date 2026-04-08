export const createMockRes = () => {
    const res = {
        statusCode: 200,
        body: undefined,
        cookies: [],
        clearedCookies: [],
        status(code) {
            this.statusCode = code;
            return this;
        },
        cookie(name, value, options) {
            this.cookies.push({ name, value, options });
            return this;
        },
        clearCookie(name, options) {
            this.clearedCookies.push({ name, options });
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };

    return res;
};

export const invokeHandler = async (handler, req = {}) => {
    const res = createMockRes();
    let nextError;

    handler(req, res, (err) => {
        nextError = err;
    });

    await new Promise((resolve) => setImmediate(resolve));

    return { res, nextError };
};
