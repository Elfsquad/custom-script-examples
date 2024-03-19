## Use case
Since 25-05-2023 there is a new dropdown type for the quotation
properties. With this new dropdown type the value of the quotation
property is stored in the table; `quotationPropertyValues` where it with
the depricated it was stored in a `quotation` record on property
`propertyIds`. When a user changes de quotation property of the
depricated dropdown type, all the quotations with a value to this
property the value will not be visible on the quotation in the EMS. The
value of the selected option in the dropdown will not be deleted in the
quotation record. 

To prevent that users get confused the selected value of that property
on all the quotation must be updated in the `quotationPropertyValues`
table.

## Functions
1. Get the quotation property information based on the parameter from trigger and check if this is of type <em>FieldSelect</em>.
2. Get all the quotation property fields.
3. Query through all the quotation if there are quotations where the property `propertyIds` is equal to one of the fields.
4. Create a body for each quotation that has a selected field.
5. Show a dialog with the question if the user are sure to update all the quotations property values. **This must be changed since it is done in OpenFormDialog, we don't support this any longer.**.
6. If the user confirms, the property type is changed to the new property type <em>Dropdown</em>
7. Then all the values are added to the quotationPropertyValues table.
8. If the user denies, nothing happens.

## Preperations and additions
1. Add a custom trigger with position **quotation property**

