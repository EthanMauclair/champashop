const __VLS_props = defineProps({
    product: {
        type: Object,
        required: true
    }
});
const __VLS_ctx = {
    ...{},
    ...{},
    ...{},
};
let __VLS_components;
let __VLS_intrinsics;
let __VLS_directives;
/** @type {__VLS_StyleScopedClasses['product-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.article, __VLS_intrinsics.article)({
    ...{ class: "product-card" },
});
/** @type {__VLS_StyleScopedClasses['product-card']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.img)({
    src: (__VLS_ctx.product.thumbnail),
    alt: (__VLS_ctx.product.title),
    ...{ class: "product-image" },
});
/** @type {__VLS_StyleScopedClasses['product-image']} */ ;
__VLS_asFunctionalElement1(__VLS_intrinsics.h2, __VLS_intrinsics.h2)({
    ...{ class: "product-title" },
});
/** @type {__VLS_StyleScopedClasses['product-title']} */ ;
(__VLS_ctx.product.title);
__VLS_asFunctionalElement1(__VLS_intrinsics.p, __VLS_intrinsics.p)({
    ...{ class: "product-price" },
});
/** @type {__VLS_StyleScopedClasses['product-price']} */ ;
(__VLS_ctx.product.price);
// @ts-ignore
[product, product, product, product,];
const __VLS_export = (await import('vue')).defineComponent({
    props: {
        product: {
            type: Object,
            required: true
        }
    },
});
export default {};
