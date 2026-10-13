(() => {
  "use strict";
  const groups = {
      search_eval: ["search-eval-data.js", "search-model.js", "search-eval.js"],
    },
    states = new Map();
  function load(name) {
    if (name === "search_eval" && window.NikkiSearchEval)
      return Promise.resolve();
    if (states.get(name)?.promise) return states.get(name).promise;
    const state = { status: "loading" };
    state.promise = (async () => {
      for (const file of groups[name] || []) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = file;
          script.dataset.optional = "true";
          script.onload = resolve;
          script.onerror = () => {
            script.remove();
            reject(Error("Evaluation data unavailable"));
          };
          document.head.append(script);
        });
      }
      if (name === "search_eval" && !window.NikkiSearchEval)
        throw Error("Evaluation module initialization failed");
      state.status = "ready";
    })().catch((e) => {
      state.status = "error";
      throw e;
    });
    states.set(name, state);
    return state.promise;
  }
  window.NikkiModules = {
    load,
    status: (name) => states.get(name)?.status,
    retry(name) {
      states.delete(name);
      return load(name);
    },
  };
})();
