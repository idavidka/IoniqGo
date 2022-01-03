import { isNil } from "lodash";
import { useCallback } from "react";
import { useState } from "react";
import { findKey, formatters, get, isTrue } from "../utils";

const getResponseBody = (subjects, key) => {
  let usedSubject = subjects?.[subjects?.length - 1]?.body ?? null;
  let usedKey = key;

  if (usedKey.indexOf("@responses.") === 0) {
    usedKey = usedKey.replace("@responses.", "");
    usedSubject = subjects;
  }

  return get(usedSubject, usedKey);
};

export const parseTemplatesUtil = (
  subjects,
  possibleTemplates = [],
  isOnDemand = false
) => {
  if (!subjects?.length && !isOnDemand) {
    return [];
  }

  const newTemplatesCache = {};
  const newTemplates = [];
  const lastSubject = subjects?.[subjects?.length - 1] ?? null;

  if (
    ((lastSubject?.body?.status !== 200 &&
      lastSubject?.headers?.status !== 200) ||
      lastSubject?.main?.status !== 200) &&
    !isOnDemand
  ) {
    newTemplatesCache[0] = {
      label: `Error ${
        lastSubject?.main?.status
          ? lastSubject?.main?.status
          : lastSubject?.body?.status ?? lastSubject?.headers?.status ?? ""
      }:`,
      value: lastSubject?.main?.statusText
        ? lastSubject?.main?.statusText
        : lastSubject?.body?.statusText ??
          lastSubject?.headers?.statusText ??
          "Unknown",
    };
    newTemplates.push(newTemplatesCache[0]);
  }

  const parents = possibleTemplates.filter(
    (possibleTemplate) =>
      isNil(possibleTemplate.parent_id) || possibleTemplate.parent_id === ""
  );
  const children = possibleTemplates.filter(
    (possibleTemplate) =>
      !isNil(possibleTemplate.parent_id) && possibleTemplate.parent_id !== ""
  );
  [...parents, ...children].forEach((possibleTemplate) => {
    let validValue = getResponseBody(subjects, possibleTemplate.key);
    let validLabel = possibleTemplate.label;

    const dependsOn = possibleTemplate.valueDependsOn
      ? getResponseBody(subjects, possibleTemplate.valueDependsOn)
      : undefined;

    const formatter = possibleTemplate.formatter;
    const formatterParams = possibleTemplate.formatterParams
      ? possibleTemplate.formatterParams.split(",")
      : [];

    if (
      isTrue(validValue) &&
      (!possibleTemplate.valueDependsOn ||
        (possibleTemplate.valueDependsOn && isTrue(dependsOn)))
    ) {
      validValue = possibleTemplate.valueIf ?? validValue;
    } else {
      validLabel = possibleTemplate.labelElse ?? possibleTemplate.label;
      validValue = possibleTemplate.valueElse ?? validValue;
    }

    if (!isNil(validValue)) {
      const arrayValues =
        typeof validValue === "object"
          ? validValue
          : { [validLabel]: validValue };
      Object.entries(arrayValues).forEach(([templateKey, templateValue]) => {
        const formattedValue = formatters[formatter]
          ? formatters[formatter](templateValue, formatterParams)
          : {
              value: templateValue,
              appendix: possibleTemplate.formatterParams,
            };

        const keyLabel = validLabel.match(/@key(\((?<label>[^)]+)\))?/m);
        const key = keyLabel ? templateKey : validLabel;
        const label = keyLabel
          ? keyLabel?.groups?.label ?? templateKey
          : validLabel;
        const id = `${possibleTemplate.id}_${key}`;
        newTemplatesCache[id] = {
          formatter,
          label,
          id,
          templateId: possibleTemplate.id,
          hidden: isTrue(possibleTemplate.hidden),
          hiddenElse: isTrue(possibleTemplate.hiddenElse),
          ...formattedValue,
          children: [],
        };

        if (newTemplatesCache[id] && possibleTemplate.id) {
          const parent_id =
            findKey(
              newTemplatesCache,
              `${possibleTemplate.parent_id}_${key}`
            ) ?? findKey(newTemplatesCache, possibleTemplate.parent_id);
          if (parent_id && newTemplatesCache[parent_id]) {
            newTemplatesCache[parent_id].children.push(newTemplatesCache[id]);
          } else {
            newTemplates.push(newTemplatesCache[id]);
          }
        } else {
          newTemplates.push({ ...newTemplatesCache[id] });
        }
      });
    } else if (isOnDemand) {
      newTemplatesCache[possibleTemplate.id] = {
        label: validLabel,
        id: possibleTemplate.id,
        templateId: possibleTemplate.id,
        hidden: isTrue(possibleTemplate.hidden),
        hiddenElse: isTrue(possibleTemplate.hiddenElse),
        value: isTrue(possibleTemplate.hiddenElse) ? undefined : "-",
        children: [],
      };
      if (newTemplatesCache[possibleTemplate.id]) {
        if (
          possibleTemplate.parent_id &&
          newTemplatesCache[possibleTemplate.parent_id]
        ) {
          newTemplatesCache[possibleTemplate.parent_id].children.push(
            newTemplatesCache[possibleTemplate.id]
          );
        } else {
          newTemplates.push(newTemplatesCache[possibleTemplate.id]);
        }
      }
    }
  });

  const reducedTemplates = reduceTemplates(newTemplates);

  return reducedTemplates;
};

const reduceTemplates = (templates, level = 0) => {
  return templates.map((curr) => {
    return {
      ...curr,
      isChild: level > 0,
      level,
      children:
        curr?.children?.length > 0
          ? reduceTemplates(curr?.children, level + 1)
          : [],
    };
  }, []);
};

const useTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const parseTemplates = useCallback((subjects, possibleTemplates = []) => {
    setTemplates(parseTemplatesUtil(subjects, possibleTemplates));
  }, []);

  return { templates, parseTemplates };
};

export default useTemplates;
