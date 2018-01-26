import * as React from 'react';
import thunk from 'redux-thunk';
import * as ReactDOM from 'react-dom';
import * as JsonRefs from 'json-refs';
import { Provider } from 'react-redux';
import {
  DispatchRenderer,
  generateDefaultUISchema,
  generateJsonSchema,
  INIT,
  JsonForms,
  JsonFormsInitialState,
  jsonformsReducer,
  JsonFormsStore,
  JsonSchema,
  VALIDATE
} from '@jsonforms/core';
import { applyMiddleware, createStore } from 'redux';

/**
 * Configuration element that associated a custom element with a selector string.
 */
interface CustomElementConfig {
  selector: string;
}

/**
 * Annotation that registered the given config and class as a custom element
 * @param {CustomElementConfig} config the configuration object for the custom element
 * @constructor
 */
// Usage as decorator
// tslint:disable:variable-name
const CustomElement = (config: CustomElementConfig) => cls => {
// tslint:enable:variable-name
  if (customElements.get(config.selector)) {
    return;
  }
  customElements.define(config.selector, cls);
};

// TODO: Type parameter

/**
 * HTML element that represents the entry point
 */
@CustomElement({
  selector: 'json-forms'
})
export class JsonFormsElement extends HTMLElement {

  private allowDynamicUpdate = false;
  private _store: JsonFormsStore;

  /**
   * Constructor.
   */
  constructor() {
    super();
  }

  /**
   * Called when this element is inserted into a document.
   */
  connectedCallback(): void {
    this.allowDynamicUpdate = true;
    this.render();
  }

  /**
   * Set the data to be rendered.
   * @param {Object} initialState initial state describing what is to be rendered
   */
  set state(initialState: JsonFormsInitialState) {

    const dataSchema = initialState.schema || generateJsonSchema(initialState.data);

    const setupStore = schema => {
      const state = {
        jsonforms: {
          common: {
            data: initialState.data,
            schema,
            uischema: initialState.uischema || generateDefaultUISchema(schema)
          },
          renderers: JsonForms.renderers,
          fields: JsonForms.fields,
        }
      };
      const store = createStore(
        jsonformsReducer(),
        state,
        applyMiddleware(thunk),
      );
      store.dispatch({
        type: INIT,
        data: state.jsonforms.common.data,
        schema,
        uischema: state.jsonforms.common.uischema
      });

      store.dispatch({
        type: VALIDATE,
        data: state.jsonforms.common.data
      });

      return store;
    };

    JsonRefs
      .resolveRefs(dataSchema, {includeInvalid: true})
      .then(result => {
        this._store = setupStore(result.resolved);
        this.render();
      });
  }

  get store() {
    return this._store;
  }

  private render(): void {
    if (!this.allowDynamicUpdate) {
      return;
    }
    if (this._store === null || this._store === undefined) {
      return;
    }

    this.instantiateSchemaIfNeeded(this._store.getState().jsonforms.common.schema);
    const storeId = new Date().toISOString();

    ReactDOM.render(
      <Provider store={this._store} key={`${storeId}-store`}>
        <DispatchRenderer />
      </Provider>,
      this
    );
  }

  private instantiateSchemaIfNeeded(schema: JsonSchema): void {
    let parent = this.parentNode;
    while (parent !== document.body && parent !== null) {
      if (parent.nodeName === 'JSON-FORMS') {
        return;
      }
      parent = parent.parentNode;
    }
    JsonForms.schema = schema;
  }
}