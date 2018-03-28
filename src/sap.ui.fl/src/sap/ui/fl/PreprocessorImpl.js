/*!
 * ${copyright}
 */

// Provides object sap.ui.fl.ProcessorImpl
sap.ui.define([
	'jquery.sap.global',
	'sap/ui/core/Component',
	'sap/ui/fl/FlexControllerFactory',
	'sap/ui/fl/Utils',
	'sap/ui/fl/LrepConnector',
	'sap/ui/fl/ChangePersistenceFactory'
],
function(
	jQuery,
	Component,
	FlexControllerFactory,
	Utils,
	LrepConnector,
	ChangePersistenceFactory
) {
	'use strict';

	/**
	 * The implementation of the <code>Preprocessor</code> for the SAPUI5 flexibility services that can be hooked in the <code>View</code> life cycle.
	 *
	 * @name sap.ui.fl.PreprocessorImpl
	 * @class
	 * @constructor
	 * @author SAP SE
	 * @version ${version}
	 * @experimental Since 1.27.0
	 */
	var PreprocessorImpl = function(){
	};

	/**
	 * Provides an array of extension providers. An extension provider is an object which were defined as controller extensions. These objects
	 * provides lifecycle and event handler functions of a specific controller.
	 *
	 * @param {string} sControllerName - name of the controller
	 * @param {string} sComponentId - unique id for the running controller - unique as well for manifest first
	 * @param {boolean} bAsync - flag whether <code>Promise</code> should be returned or not (async=true)
	 * @see sap.ui.controller for an overview of the available functions on controllers.
	 * @since 1.34.0
	 * @public
	 */
	PreprocessorImpl.prototype.getControllerExtensions = function(sControllerName, sComponentId, bAsync) {
		if (bAsync) {

			if (!sComponentId) {
				jQuery.sap.log.warning("No component ID for determining the anchor of the code extensions was passed.");
				//always return a promise if async
				return Promise.resolve([]);
			}

			var oComponent = sap.ui.component(sComponentId);
			var oAppComponent = Utils.getAppComponentForControl(oComponent);
			var sFlexReference = Utils.getComponentClassName(oAppComponent);
			var sAppVersion = Utils.getAppVersionFromManifest(oAppComponent.getManifest());

			var oChangePersistence = ChangePersistenceFactory.getChangePersistenceForComponent(sFlexReference, sAppVersion);
			return oChangePersistence.getChangesForComponent().then(function(oChanges) {

				var aExtensionProviders = [];

				jQuery.each(oChanges, function (index, oChange) {
					var oChangeDefinition = oChange.getDefinition();
					if (oChangeDefinition.changeType === "codeExt" && oChangeDefinition.content &&
						sControllerName === oChangeDefinition.selector.controllerName
					) {
						aExtensionProviders.push(PreprocessorImpl.getExtensionProvider(oChangeDefinition));
					}
				});

				return Promise.all(aExtensionProviders);
			});
		} else {
			jQuery.sap.log.warning("Synchronous extensions are not supported by sap.ui.fl.PreprocessorImpl");
			return [];
		}
	};

	PreprocessorImpl.getExtensionProvider = function(oChange) {
		return new Promise(function(resolve, reject) {
			var sConvertedAsciiCodeContent = oChange.content.code || {};
			var sConvertedCodeContent = Utils.asciiToString(sConvertedAsciiCodeContent);
			try {
				/*eslint-disable */
				new Function(sConvertedCodeContent)();
				/*eslint-enable */
			} catch (oError) {
				Utils.log.error("Error occured while executing the code extension: ", oError.message);
				resolve({});
			}
			sap.ui.require([oChange.content.extensionName], function(Extension) {
				resolve(Extension);
			}, reject);
		});
	};

	 return PreprocessorImpl;

}, /* bExport= */true);
