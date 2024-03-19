async function fetchQuotationProperty() {
    return (await api.fetch(`data/1/quotationProperties/${parameters.quotationPropertyId}`)).body;
}
async function fetchQuotationPropertyFields() {
    return (await api.fetch(`data/1/quotationPropertyFields?filter=entityPropertyId eq ${parameters.quotationPropertyId}`)).body;
}

async function fetchQuotations() {
    return (await api.fetch(`data/1/quotations`)).body;
}

async function fetchQuotationPropertyValues() {
    return (await api.fetch(`data/1/quotationPropertyValues?filter=entityPropertyId eq ${parameters.quotationPropertyId}`)).body;
}

async function updateQuotationPropertyValues() {
    const quotationProperty = await fetchQuotationProperty();
    const quotationPropertyType = quotationProperty.type;

    if (quotationPropertyType == 'FieldSelect') {
        const quotationbody = await fetchQuotations();
        const quotations = quotationbody.value;
        const quotationPropertyFieldBody = await fetchQuotationPropertyFields();
        const quotationPropertyFields = quotationPropertyFieldBody.value;
        const quotationWithSameFieldIds = quotations.reduce((result, obj) => {
            const matchinPropertyIds = obj.propertyIds.filter(id => quotationPropertyFields.some(item => item.id === id));
            if (matchinPropertyIds.length > 0) {
                result.push({
                    quotationId: obj.id,
                    propertyIds: matchinPropertyIds
                });
            }
            return result;
        }, []);
        const existingValuesBody = await fetchQuotationPropertyValues();
        const existingValues = existingValuesBody.value;
        const updateEntities = quotationWithSameFieldIds.filter(obj => {
            return !existingValues.some(item => item.entityId === obj.quotationId);
        }).map(({
            quotationId,
            propertyIds
        }) => ({
            entityId: quotationId,
            entityPropertyId: parameters.quotationPropertyId,
            value: propertyIds[0]
        }));


        ui.openFormDialog({
                width: '50px',
                height: '50px',
                title: 'Quotation property dropdown',
                schema: {
                    properties: {
                        name: {
                            type: "string"
                        }
                    }
                },
                uiSchema: {
                    type: "Group",
                    label: 'Are you sure you want to update ' + updateEntities.length + ' quotations?',
                    elements: []
                },
                data: {},
                confirm: 'Yes',
                cancel: "No"
            })
            .then(async (result) => {
                if (!result) return;
                api.fetch(`/data/1/QuotationProperties/${parameters.quotationPropertyId}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                        'type': 'Dropdown'
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                api.fetch(`/data/1/QuotationPropertyValues/Default.BulkInsert`, {
                    method: 'POST',
                    body: JSON.stringify({
                        'entities': updateEntities
                    }),
                    headers: {
                        'Content-Type': 'application/json'
                    }
                })
            });
    } else {
        ui.openFormDialog({
            width: '50px',
            height: '50px',
            title: 'Quotation property dropdown',
            schema: {
                properties: {
                    name: {
                        type: "string"
                    }
                }
            },
            uiSchema: {
                type: "Group",
                label: 'This is not an the legacy dropdown',
                elements: []
            },
            data: {},
            confirm: 'Yes'
        })
    }
}

updateQuotationPropertyValues();

