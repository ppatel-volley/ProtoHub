/**
 * Custom ESLint rule to enforce page.goto() uses exactly "./"
 * in functional tests to ensure tests always navigate to the base URL.
 */
export default {
    meta: {
        type: "suggestion",
        docs: {
            description: 'Enforce page.goto() uses exactly "./"',
            category: "Best Practices",
        },
        messages: {
            invalidGoto:
                'page.goto() must use exactly "./" in functional tests. Found: "{{value}}"',
        },
        schema: [],
    },
    create(context) {
        return {
            CallExpression(node) {
                if (
                    node.callee.type === "MemberExpression" &&
                    node.callee.object.name === "page" &&
                    node.callee.property.name === "goto" &&
                    node.arguments.length > 0
                ) {
                    const arg = node.arguments[0]

                    if (arg.type === "Literal" && typeof arg.value === "string") {
                        if (arg.value !== "./") {
                            context.report({
                                node: arg,
                                messageId: "invalidGoto",
                                data: { value: arg.value },
                            })
                        }
                    } else if (arg.type === "TemplateLiteral") {
                        context.report({
                            node: arg,
                            messageId: "invalidGoto",
                            data: { value: "<template literal>" },
                        })
                    }
                }
            },
        }
    },
}
