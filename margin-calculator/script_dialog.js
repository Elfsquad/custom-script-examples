let quotationData;
let totalCostPriceQuotation;
let totalCPMinQD;
let totalCPPlusSurcharge;
let totalPriceMinCD;
let totalPriceIncTax;
let totalMarginQ = 0;
let currentCDiscount;

let customerDiscountIn = 0;
let surchargeIn = 0;
let quantityDiscountIn = 0;
let taxRateIn = 0;

let quantityDiscount = 0;
let surcharge = 0;
let taxRate = 0;
let customerDiscount = 0;
let netPurchSpinder = 0;
let subTotalQuotation;

const culture = 'nl-NL';
const quotation = await fetchQuotationAsync();
const currencyFormat = new Intl.NumberFormat(culture, { // TODO: fetch culture from user
    style: 'currency',
    currency: quotation.currencyIso
});
const numberFormat = new Intl.NumberFormat(culture, {
    maximumFractionDigits: 2 
});

const resVats = (await api.fetch('api/2/VATs')).body
const discounts = (await fetchAllAsync(`data/1/QuotationDiscountLines`));

async function main() {
    await loadScriptAsync("https://unpkg.com/@fluentui/web-components");
    await fetchDataInit();
    createUI();
    addLogic();
}


// Grabbing the root Node/line from a group.
function rootLine(group) {
    return group.find(l => l.groupedRootLine);
}

// Calculate the Total Sales Price of all lines
function totalPrice(lines, vats = null) {
    lines = lines.map((l) => {return {...l, lineVatPct: vats?.find(v => v.id === l.vatId).pct ?? 0}})        
    const outz = lines
        .map(l => (l.unitPrice / (1 + l.lineVatPct/100)) * l.quantity)
        .reduce((a, b) => a + b, 0);
    return outz;
}

// Calculate the Cost Price of a line
function costPrice(line) {
    return line.originalUnitPrice * (1 - line.purchasePriceDiscountPct / 100);
}

// Calculate the Total Cost Price
const totalCostPrice = (group):number => {
    return group
        .map(line => costPrice(line) * line.quantity)
        .reduce((a,b) => a + b, 0);
};

// Calculate the total margin in %
const totalMarginPct = (group, vats = null) => {
    return ((totalMargin(group, vats) / totalPrice(group,vats) * 100));
};

// Calculate total margin
const totalMargin = (group, vats = null) => {
    return totalPrice(group, vats) - totalCostPrice(group);
};

// Function needed for loading Apex Charts
async function loadScriptAsync(url) {
    let promise = new Promise((resolve) => {
        const scriptTag = document.createElement('script');
        scriptTag.setAttribute('src', url);
        scriptTag.setAttribute('type', 'module');
        scriptTag.addEventListener('load', () => { 
            resolve();
        });
        document.head.appendChild(scriptTag);
    });
    return promise;
}

//Convert to readable Object for React Components.
function groupBy(xs, key) {
  return xs.reduce(function(rv, x) {
    (rv[x[key]] = rv[x[key]] || []).push(x);
    return rv;
  }, {});
};

// Function for fetching data from certain URL
async function fetchAllAsync(url) {
    let nextUrl = url;
    let result = [ ];
    while(nextUrl) {
        let response = await api.fetch(nextUrl);
        result.push(...response.body.value);
        nextUrl = response.body['@odata.nextLink'];
    }
    return result;
}

// Fetch current Quotation Details
async function fetchQuotationAsync() {
    return (await api.fetch(`data/1/quotations/${parameters.quotationId}`)).body;
}

// Fetch Quotation lines and put them in an Object as a group.
async function fetchQuotationGroupsAsync() {
    const quotationLines = await fetchAllAsync(`data/1/quotationlines?$filter=quotationId eq ${parameters.quotationId}&$expand=Feature`);
    let retVal = Object.values(groupBy(quotationLines, 'groupId'));
    return retVal;
}

//Apply Quantity Discount
function applyQuanDisc() {
    quotationData = quotationData.map(i => {
        i.map(l => {
            l.discountPct = quantityDiscountIn;
        });
        return i;
    });
}

//Apply Customer Discount
async function applyCustomerDiscount() {
    if (currentCDiscount?.discountPct == parseInt(customerDiscountIn, 0)) return;
    if (!currentCDiscount) {
        let createRes = await api.fetch('data/1/quotationDiscountLines', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                quotationId: `${parameters.quotationId}`,
                description: `customer-discount`,
                discountPct: parseInt(customerDiscountIn, 0),
                type: "SalesDiscount",
                discountOnExVat: false
            })
        })
        // console.log("RES", createRes);
        if(createRes.status >=200 && createRes.status < 300) {
            currentCDiscount = createRes.body;
        }
    } else {
        console.log(currentCDiscount);
        let updateRes = await api.fetch(`data/1/quotationDiscountLines(${currentCDiscount.id})`, {
            method: 'PATCH',
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                discountPct: parseInt(customerDiscountIn, 0),
            })
        });
        // console.log("RES Up", updateRes);
        if (updateRes.status >= 200 && updateRes < 300) currentCDiscount.discountPct = parseInt(customerDiscountIn, 0); 
    }
}

//Apply VAT
async function applyVat() {
    let eqVat = resVats.find(v => v.pct == taxRateIn && v.includesVAT == false);
    if (!eqVat) {
        taxRateIn = parseInt(taxRateIn, 0);
        let createRes = await api.fetch('data/1/vats', {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                name: `MC-VAT-${taxRateIn}`,
                pct: taxRateIn,
                includesVAT: false,
                defaultVat: false,
            })
        })
        console.log("RES", createRes);
        if(createRes.status >=200 && createRes.status < 300) eqVat = createRes.body;
    }
    // console.log(" VATSKE ", eqVat);
    quotationData = quotationData.map(i => {
        i.map(l => {
            l.vatId = eqVat.id;
        });
        return i;
    });
}

//Apply Surcharge
function applySurcharge() {
    quotationData = quotationData.map(i => {
        i.map(l => {
            l.marginPct = surchargeIn;
            l.unitPrice = l.originalUnitPrice * (1 + (surchargeIn / 100));
        });
        return i;
    });
}

//Button Click Event
async function processCalculation(event) {
    // console.log("Test", event, quotationData);
    // applyQuanDisc(); //should find something for quantity Disc.
    applySurcharge();
    await applyVat();
    await applyCustomerDiscount();
    // console.log("🥖", quotationData[0]);

    //Update Lines
    console.log("LINES", quotationData);
    let lines = []
    quotationData.forEach((l) => { lines.push(...l) });
    console.log("LINES", lines);
    let res = await api.fetch('data/1/quotationlines/BulkUpdate', {
        method: 'POST',
        body: JSON.stringify({
            entities:  lines.map(l => ({
            id: l.id,
            discountPct: l.discountPct,
            marginPct: l.marginPct,
            unitPrice: l.unitPrice,
            vatId: l.vatId
            }))
        })
    });
    showFinalProcess();
}

function showFinalProcess() {
    let endScreen = document.createElement("section");
    endScreen.style.width = "100%";
    endScreen.style.height = "150%";
    endScreen.style.position = "absolute";
    endScreen.style.top = "0px";
    endScreen.style.left = "0px";
    endScreen.style.background = "black";
    endScreen.style.opacity = "0.75";
    endScreen.style.zIndex = "10";
    endScreen.style.display = "flex";
    endScreen.style.justifyContent = "center";
    endScreen.style.alignItems = "center";

    let endContainer = document.createElement("div");
    endContainer.style.width = "50%";
    endContainer.style.height = "50%";
    endContainer.style.color = "white";
    endContainer.style.fontFamily = `"Segoe UI Variable", "Segoe UI"`;
    endContainer.style.textAlign = "center";
    endContainer.style.fontSize = "1.8rem";
    endContainer.innerHTML = `<p>The new values has been updated!</p> <br> <p>Please close the dialog and <b>refresh</b> the quotation page.</p>`;
    
    endScreen.appendChild(endContainer);
    document.body.appendChild(endScreen).scrollIntoView();
}

//OnChange Listener
function quantityDiscountListener(event,init=false) {
    if (!!event) quantityDiscountIn = event.target.value;
    let totalDisc = totalCostPriceQuotation * (quantityDiscountIn / 100);
    totalCPMinQD = totalCostPriceQuotation - totalDisc;
    totalDisc = currencyFormat.format(totalDisc);
    let minusTotalDisc = currencyFormat.format(totalCPMinQD);

    changeTextElement("#mc-quantityDisc p.mc-value",totalDisc);
    changeTextElement("#mc-netPruchSpinder p.mc-value",minusTotalDisc);
    updateTotalMarginUI();
}

function surchargeListener(event, init=false) {
    if (!!event) surchargeIn = event.target.value;
    let totalSurc = totalCostPriceQuotation * (surchargeIn / 100);
    totalCPPlusSurcharge = totalCostPriceQuotation + totalSurc;
    totalSurc = currencyFormat.format(totalSurc);
    let plusSurcharge = currencyFormat.format(totalCPPlusSurcharge);

    changeTextElement("#mc-surcharge p.mc-value", totalSurc);
    changeTextElement("#mc-subTotalQuote p.mc-value", plusSurcharge);
    if (!init) customerDiscountListener();
    else updateTotalMarginUI();
}

function customerDiscountListener(event, init=false) {
    if (!!event) customerDiscountIn = event.target.value;
    let totalDisc = totalCPPlusSurcharge * (customerDiscountIn / 100);
    totalPriceMinCD = totalCPPlusSurcharge - totalDisc;
    totalDisc = currencyFormat.format(totalDisc);
    let minCustomerDisc = currencyFormat.format(totalPriceMinCD);

    changeTextElement("#mc-customerDisc .mc-value", totalDisc);
    changeTextElement("#mc-quoteTotalSale .mc-value", minCustomerDisc);
    taxRateListener();
}

function taxRateListener(event) {
    if (!!event) taxRateIn = event.target.value;
    let totalTax = totalPriceMinCD * (taxRateIn / 100);
    totalPriceIncTax = totalPriceMinCD + totalTax;
    totalTax = currencyFormat.format(totalTax);
    let plusTaxRate = currencyFormat.format(totalPriceIncTax);

    changeTextElement("#mc-taxRate .mc-value", totalTax);
    changeTextElement("#mc-totalPriceIncTax .mc-value", plusTaxRate);
    updateTotalMarginUI()
}

function updateTotalMarginUI() {
    totalMarginQ = (totalCostPriceQuotation * (quantityDiscountIn / 100)) 
        + (totalCostPriceQuotation * (surchargeIn / 100)) 
        - (totalCPPlusSurcharge * (customerDiscountIn / 100));
    let value = currencyFormat.format(totalMarginQ);
    let ratio = (totalMarginQ / totalCPMinQD * 100).toFixed(2)
    changeTextElement("#mc-totalMargin .mc-label", `<b>Margin:</b> <u>${value}</u>  ( <u>${ratio}%</u> on net purchasing.)`, true)
}

async function fetchDataInit() {
    // console.log("📃",resVats);
    quotationData = await fetchQuotationGroupsAsync();

    let custdiscount = discounts.find(l => l.quotationId == parameters.quotationId && l?.description?.toLowerCase() == "customer-discount");
    if (!!custdiscount) {
        currentCDiscount = custdiscount;
        customerDiscountIn = custdiscount['discountPct'];
        customerDiscount = customerDiscountIn;
    }
    // console.log(custdiscount);

    totalCostPriceQuotation = 0;
    quotationData.forEach((gr) => {
        let rootLineGr = rootLine(gr);
        // if (rootLineGr.discountPct != 0) {
        //     quantityDiscountIn = rootLineGr['discountPct'];
        //     quantityDiscount = quantityDiscountIn;
        // }

        if (rootLineGr.marginPct != 0) {
            surchargeIn = rootLineGr.marginPct;
            surcharge = surchargeIn;
        }

        let vatIn = resVats?.find(v => v.id == rootLineGr.vatId && !v.includesVAT);
        if (!!vatIn) {
            taxRateIn = vatIn.pct;
            taxRate = taxRateIn;
        }

        // console.log("📍",gr);
        let totalPriceGr = totalCostPrice(gr);
        totalCostPriceQuotation += totalPriceGr;
        // console.log("💰", totalCostPriceQuotation);
    });
}

function changeTextElement(selector, text, html=false) {
    const pValue = document.querySelector(selector);
    if (html) {
        pValue.innerHTML = text;
        return;
    }
    pValue.innerText = text;
}


function createUI() {
    const mainUI = document.createElement("main");
    mainUI.innerHTML = `
        <div id="mc-totalPrice">
            <p class="mc-label">Total Price:</p> <p class="mc-value">${currencyFormat.format(totalCostPriceQuotation)}</p>
        </div>
        <fluent-divider></fluent-divider>
        <div id="mc-quantityDisc">
            <fluent-number-field id="qDiscInput" max="100" step="0.01" value="${quantityDiscount}">Quantity Discount(-%): </fluent-number-field> <p class="mc-value good">${currencyFormat.format(totalCostPriceQuotation * (quantityDiscount / 100))}</p> 
        </div>
        <div id="mc-netPruchSpinder">
            <p class="mc-label">Net Purchases by Spinder:</p> <p class="mc-value total">${currencyFormat.format(totalCostPriceQuotation - (totalCostPriceQuotation * (quantityDiscount / 100)))}</p>
        </div>
        <fluent-divider></fluent-divider>
        <div id="mc-surcharge">
            <fluent-number-field id="surchargeInput" max="100" step="0.01" value="${surcharge}">Surcharge(+%): </fluent-number-field> <p class="mc-value good">${currencyFormat.format(totalCostPriceQuotation * (surcharge / 100))}</p> 
        </div>
        <div id="mc-subTotalQuote">
            <p class="mc-label">Subtotal quotation:</p> <p class="mc-value total">${currencyFormat.format(totalCostPriceQuotation + (totalCostPriceQuotation * (surcharge / 100)))}</p>
        </div>
        <div id="mc-customerDisc">
            <fluent-number-field id="cDiscInput" max="100" step="0.01" value="${customerDiscount}">Customer Discount(-%): </fluent-number-field> <p class="mc-value bad">${currencyFormat.format(totalCostPriceQuotation * (customerDiscount / 100))}</p> 
        </div>
        <div id="mc-quoteTotalSale">
            <p class="mc-label">Quotation Total Sales:</p> <p class="mc-value total">${currencyFormat.format(totalCostPriceQuotation - (totalCostPriceQuotation * (customerDiscount / 100)))}</p>
        </div>
        <div id="mc-taxRate">
            <fluent-number-field id="taxRateInput" max="100" step="0.01" value="${taxRate}">Tax Rate(+%): </fluent-number-field> <p class="mc-value">${currencyFormat.format(totalPriceMinCD * (taxRate / 100))}</p> 
        </div>
        <div id="mc-totalPriceIncTax">
            <p class="mc-label">Total Price Incl. VAT:</p> <p class="mc-value total">${currencyFormat.format(totalPriceMinCD + (totalPriceMinCD * (taxRate / 100)))}</p>
        </div>
        <fluent-divider></fluent-divider>
        <div id="mc-totalMargin">
            <p class="mc-label">Margin: ${currencyFormat.format(totalMarginQ)}</p>
        </div>
        <fluent-divider></fluent-divider>
        <div id="mc-actions">
            <fluent-button id="processCalc">Process Calculation</fluent-button>
        </div>
    `;
    mainUI.style.width = "50%";
    mainUI.style.margin = "5% auto";
    mainUI.style.borderRadius = "5px";
    mainUI.style.boxShadow = "0px 3px 15px rgba(0,0,0,0.2)";
    mainUI.style.background = "white";
    document.body.appendChild(mainUI);
    document.body.style.height = "100%";
    document.querySelector("html").style.height = "100%";
    addStyleAll("p", (p)=>{ 
        p.style.fontFamily = `"Segoe UI Variable", "Segoe UI"`; 
    });
    document.querySelector("html").setAttribute('style', "background: radial-gradient(circle at 18.7% 37.8%, rgb(250, 250, 250) 0%, rgb(225, 234, 238) 90%);")

    

    addStyleAll(".bad", (g)=> {
        g.style.color = "#de1a24";
    });

    addStyleAll(".good", (g)=> {
        g.style.color = "#3f8f29";
    });

    addStyleAll("main div", (d) => {
        d.style.padding = "5px 10%";
        d.style.display = "flex";
        d.style.justifyContent = d.id === "mc-actions" ? "flex-end" : "space-between"
    });

    addStyleAll("p.total", (p) => {
        p.style.borderTop = "1px black solid";
    });
}

function addStyleAll(elemsSelector, styleFunc) {
    let elems = document.querySelectorAll(elemsSelector);
    for (let i = 0; i < elems.length; i++) {
        styleFunc(elems[i]);
    }
}

function addLogic() {
    const processCalcBtn = document.getElementById("processCalc");
    processCalcBtn.addEventListener("click", (e) => processCalculation(e));

    const quantityDiscountInput = document.getElementById("qDiscInput");
    quantityDiscountInput.addEventListener("input", (e) => quantityDiscountListener(e));

    const surchargeInput = document.getElementById("surchargeInput");
    surchargeInput.addEventListener("input", (e) => surchargeListener(e));

    const customerDiscountInput = document.getElementById("cDiscInput");
    customerDiscountInput.addEventListener("input", (e) => customerDiscountListener(e));

    const taxRateInput = document.getElementById("taxRateInput");
    taxRateInput.addEventListener("input", (e) => taxRateListener(e));

    quantityDiscountListener(null,true);
    surchargeListener(null,true);
    customerDiscountListener(null, true);
}

main()
