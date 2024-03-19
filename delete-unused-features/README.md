
## Use case
As a user you want to delete unused features. In EMS it is possible to
see all the features that are used (and not used) in a configuration
model. 

However, there are features that are used indirect in a configuration
model via a dynamic group and/or as an associated features, these must
not be deleted. Therefore, this script is made so all the really unused
features can be deleted. 

## Functions
1. Get all information via the endpoints; `features`, `featureNodes`, `associatedFeatures`, `featureHasFeatureProperties`, and `FeatureModelDynamicGroupFilters`
2. Query through all the features that aren't in a model (no featureId in `featureNodes`) or used as an associated feature (no featureId in `associatedFeatures`)
3. Query through all the feature properties that are used as a dynamic group filter, and select all the features that are related to this property (possible results in a dynamic group).
4. Features of query 1 (step2) that are in the result of query 2 (step3) are left out, the others are added to an endresult array.
5. The user gets a dialog with the a confirmation question to delete the x number of features. **This must be changed since it is done in OpenFormDialog, we don't support this any longer.**.
6. If yes the endresult of the features will be deleted via a bulk request. 

## Preperations and additions
1. Add a custom trigger with position **features overview**

