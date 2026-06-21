const results = [];

Promise.resolve(42)
  .then((value) => value + 1)
  .catch((error) => results.push(error))
  .finally(() => results.push('done'));

const wrapper = {
  catch(handler) {
    return handler;
  },
  finally() {
    return true;
  }
};

results.push(wrapper.catch((e) => e));
results.push(wrapper.finally());
