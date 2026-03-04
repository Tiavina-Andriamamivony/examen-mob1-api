# Wallet

## Properties

| Name                    | Type                                              |
| ----------------------- | ------------------------------------------------- |
| `id`                    | string                                            |
| `accountId`             | string                                            |
| `name`                  | string                                            |
| `description`           | string                                            |
| `type`                  | string                                            |
| `color`                 | string                                            |
| `iconRef`               | string                                            |
| `amount`                | number                                            |
| `isActive`              | boolean                                           |
| `walletAutomaticIncome` | [WalletAutomaticIncome](WalletAutomaticIncome.md) |

## Example

```typescript
import type { Wallet } from "";

// TODO: Update the object below with actual values
const example = {
  id: null,
  accountId: null,
  name: null,
  description: null,
  type: null,
  color: null,
  iconRef: null,
  amount: null,
  isActive: null,
  walletAutomaticIncome: null,
} satisfies Wallet;

console.log(example);

// Convert the instance to a JSON string
const exampleJSON: string = JSON.stringify(example);
console.log(exampleJSON);

// Parse the JSON string back to an object
const exampleParsed = JSON.parse(exampleJSON) as Wallet;
console.log(exampleParsed);
```

[[Back to top]](#) [[Back to API list]](../README.md#api-endpoints) [[Back to Model list]](../README.md#models) [[Back to README]](../README.md)
