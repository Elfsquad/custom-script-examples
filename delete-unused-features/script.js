async function fetchFeatures() {
    return (await api.fetch(`api/2/features`)).body;
}
async function fetchFeatureNodes() {
    return (await api.fetch(`api/2/featureModelNodes`)).body;
}
async function fetchAssociatedFeatures() {
    return (await api.fetch(`api/2/AssociatedFeatureProperties`)).body;
}
async function featureHasFeatureProperties() {
    return (await api.fetch(`api/2/featureHasFeatureProperties`)).body;
}
async function featureModelDynamicGroupFilters() {
    return (await api.fetch(`api/2/FeatureModelDynamicGroupFilters`)).body;
}

async function featuresUnused() {
    //get all features
    const features = await fetchFeatures();
    //select id of features
    const featureIds = features.map(f => f.id);
    //get all featureNodes
    const featureNodes = await fetchFeatureNodes();
    //select all featureId of featureModelNodes endpoint
    const featureModelNodeFeatureIds = featureNodes.map(obj => obj.featureId);
    //get all associatedfeatures
    const associatedFeatures = await fetchAssociatedFeatures();
    //select all featureId of AssociatedFeatures
    const associatedFeatureFeatureIds = associatedFeatures.map(obj => obj.featureId);
    // select all the featureIds that are not an associated feature and are not used in the configuration model
    const resultFeatureNowhereUsed = features.filter(obj => !associatedFeatureFeatureIds.includes(obj.id) && !featureModelNodeFeatureIds.includes(obj.id))
        .map(obj => obj.id)
    // get all the featurehasfeatureproperties
    const hasFeatureProperties = await featureHasFeatureProperties();
    const featureHasFeaturePropertyFeatureId = hasFeatureProperties.map(obj => obj.featureId);
    // get all the properties that are used in dynamic filters
    const dynamicGroupFilters = await featureModelDynamicGroupFilters();
    const propertyIdOfDynamicGroupFilters = dynamicGroupFilters.map(obj => obj.featurePropertyId);
    //make an array of the id of the features that can be a result of a dynamic group
    const resultDynamicGroup = Array.from(new Set(hasFeatureProperties.filter(obj => !dynamicGroupFilters.includes(obj.featurePropertyId))
        .map(obj => obj.featureId)))
    //Make an array of the id's of the features that cannot be a result in a dynamic group, are not associated features and are not used in a model.
    const endResult = resultFeatureNowhereUsed.filter(item => !resultDynamicGroup.includes(item));
    const numberOfUnusedFeatures = endResult.length;
    const titleDialog = "Are you sure you want to delete " + numberOfUnusedFeatures.toString() + " features?";
    console.log(resultDynamicGroup, resultFeatureNowhereUsed, endResult, numberOfUnusedFeatures, titleDialog)

    ui.openFormDialog({
            width: '50px',
            height: '50px',
            title: 'Delete unused features',
            schema: {
                properties: {
                    name: {
                        type: "string"
                    }
                }
            },
            uiSchema: {
                type: "Group",
                label: titleDialog,
                elements: []
            },
            data: {},
            confirm: 'Yes',
            cancel: 'No'
        })
        .then(async (result) => {
            if (!result) return;
            const featureIds = endResult;
            api.fetch(`api/2/features/bulkdelete`, {
                method: 'POST',
                body: JSON.stringify(
                    featureIds
                ),
                headers: {
                    'Content-Type': 'application/json'
                }
            })
        });


}
featuresUnused()
