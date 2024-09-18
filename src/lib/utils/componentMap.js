export const superComponentsMap = [
  {
    plugin: "bb-component-SuperContainer",
    url: "https://github.com/poirazis/bb-component-SuperContainer",
  },
  {
    plugin: "bb-component-SuperFieldText",
    url: "https://github.com/poirazis/bb-component-SuperFieldText",
  },
  {
    plugin: "bb-component-SuperFieldNumber",
    url: "https://github.com/poirazis/bb-component-SuperFieldNumber",
  },
  {
    plugin: "bb-component-SuperFieldBoolean",
    url: "https://github.com/poirazis/bb-component-SuperFieldBoolean",
  },
  {
    plugin: "bb-component-SuperFieldDatetime",
    url: "https://github.com/poirazis/bb-component-SuperFieldDatetime",
  },
  {
    plugin: "bb-component-SuperFieldOption",
    url: "https://github.com/poirazis/bb-component-SuperFieldOption",
  },
  {
    plugin: "bb-component-SuperFieldOptions",
    url: "https://github.com/poirazis/bb-component-SuperFieldOptions",
  },
  {
    plugin: "bb-component-SuperFieldRelationship",
    url: "https://github.com/poirazis/bb-component-SuperFieldRelationship",
  },
];

export const validateDeps = (deps, componentStore) => {
  if (!componentStore) return [];

  let installedComponents =
    Object.keys(componentStore.customComponentManifest) || [];

  let checkedDeps = [];

  if (deps && deps.length) {
    checkedDeps = deps.map((dep) => {
      let comp = superComponentsMap.find((x) => x.plugin == dep.plugin);
      if (comp)
        return {
          plugin: dep.plugin,
          url: comp.url,
          validDep: true,
          installed: installedComponents?.includes("plugin/" + comp.plugin),
        };
      else
        return {
          plugin: dep.plugin,
          url: undefined,
          installed: false,
          validDep: false,
        };
    });
  }

  return checkedDeps.filter((x) => x.validDep && !x.installed);
};
