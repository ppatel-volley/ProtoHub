# Developer Guidelines

This document outlines the development guidelines and best practices for the Hub project.

## Table of Contents
- [Code Architecture Principles](#code-architecture-principles)
  - [Composition Over Inheritance](#composition-over-inheritance)
  - [Classes vs Object Literals for Composition](#classes-vs-object-literals-for-composition)
  - [Pure Functions and Immutability](#pure-functions-and-immutability)
- [Frontend Architecture](#frontend-architecture)
  - [Component Structure](#component-structure)
- [Backend Architecture](#backend-architecture)
  - [Shared Code](#shared-code)
- [File Organization and Exports](#file-organization-and-exports)
  - [Export Conventions](#export-conventions)
- [Code Style](#code-style)
  - [Alphabetization](#alphabetization)
  - [Naming Conventions](#naming-conventions)
- [Testing Guidelines (WIP)](#testing-guidelines-wip)
  - [Unit Testing](#unit-testing)
  - [Frontend Testing with React Testing Library (WIP)](#frontend-testing-with-react-testing-library-wip)
- [Styling (WIP)](#styling-wip)
  - [CSS Modules with SCSS](#css-modules-with-scss)
  - [File Naming Convention](#file-naming-convention)
  - [Alternatives](#alternatives)

## Code Architecture Principles

### Composition Over Inheritance

Composition over inheritance is a design principle that suggests you should favor object composition (combining simple objects) over class inheritance (creating object hierarchies) when designing software. This principle offers several important benefits:

- **Flexibility**: Easier to change behavior at runtime
- **Testability**: Simpler to mock dependencies for isolated testing
- **Maintainability**: Reduces tight coupling between classes
- **Modularity**: Promotes building small, focused components
- **Evolution**: Allows systems to grow without complex hierarchy changes

Example of composition vs inheritance:

```typescript
// Inheritance Approach
class Animal {
  move() { console.log("Moving..."); }
}

class Bird extends Animal {
  fly() { console.log("Flying..."); }
}

// Composition Approach
interface Movable {
  move(): void;
}

interface Flyable {
  fly(): void;
}

class BasicMovement implements Movable {
  move() { console.log("Moving..."); }
}

class BasicFlight implements Flyable {
  fly() { console.log("Flying..."); }
}

class Bird {
  constructor(
    private readonly movement: Movable,
    private readonly flight: Flyable
  ) {}
  
  move() { this.movement.move(); }
  fly() { this.flight.fly(); }
}

// Usage with composition
const sparrow = new Bird(new BasicMovement(), new BasicFlight());
```

#### Classes vs Object Literals for Composition

You can implement composition using either classes or object literals, each with its own tradeoffs:

**Class-based Composition**:
```typescript
// Class-based implementation
interface ILogger {
  log(message: string): void;
}

class Logger implements ILogger {
  log(message: string) {
    console.log(`[LOG]: ${message}`);
  }
}

class DataService {
  constructor(private readonly logger: ILogger) {}
  
  fetchData() {
    this.logger.info("Fetching data...");
    // implementation
  }
}

const service = new DataService(new Logger());
```

**Object Literal Composition**:
```typescript
// Object literal implementation
interface Logger {
  log(message: string): void;
}

interface DataService {
  fetchData(): void;
}

// Implement with object literals
const logger: Logger = {
  info: (message: string) => console.log(`[LOG]: ${message}`)
};

const createDataService = (logger: Logger): DataService => ({
  fetchData: () => {
    logger.info("Fetching data...");
    // implementation
  }
});

const service = createDataService(logger);
```

**Tradeoffs**:

| Approach | Advantages | Disadvantages |
|----------|------------|---------------|
| Classes | • Encapsulation with private fields<br>• Familiar for OOP developers<br>• Clear constructor injection pattern| • More verbose<br>• Can lead to complex inheritance if misused<br>• More ceremony to create new instances |
| Object Literals | • Simpler, less boilerplate<br>• Easier to create and test<br>• More functional approach<br>• Can be created on-the-fly | • Less encapsulation<br>• Properties more exposed<br>• Factory functions needed for consistent creation |

Choose the approach that best fits your specific use case and team preferences.

### Pure Functions and Immutability

Pure functions and immutability are foundational concepts in functional programming that lead to more predictable, testable, and maintainable code. Here's what they mean:

**Pure Functions** are functions that:
- Always return the same output for the same input
- Have no side effects (don't modify external state)
- Don't depend on external mutable state

**Immutability** means:
- Once created, data cannot be changed
- Instead of modifying existing data, we create new data with the desired changes
- Original data remains untouched

These principles provide significant benefits:

- **Predictability**: Code behavior is easier to reason about
- **Testability**: Pure functions are simpler to test without complex mocks
- **Concurrency**: Immutable data is inherently thread-safe
- **Debugging**: State changes are explicit and traceable
- **Performance**: Enables optimizations like memoization and change detection

Examples:

```typescript
// Impure function (with side effects)
let counter = 0;
function incrementCounter() {
  counter++; // Modifies external state
  return counter;
}

// Pure function alternative
function increment(value: number): number {
  return value + 1; // No side effects, same input always gives same output
}

// Mutation example
const user = { name: "Alice", age: 30 };
function celebrateBirthday(user: any) {
  user.age++; // Mutates the object
}

// Immutable alternative
function celebrateBirthday(user: { name: string, age: number }) {
  return {
    ...user,    // Copy all existing properties
    age: user.age + 1  // Only override what changes
  };
}

// Usage
const olderUser = celebrateBirthday(user); // Original user object untouched
```

When building applications, we strive to use these principles where appropriate to create more maintainable and robust systems. While achieving 100% pure functions and immutability isn't always possible or practical in real-world applications (especially when dealing with I/O, external APIs, or performance-critical code), we should aim to:

- Keep impure code isolated and clearly identifiable
- Make side effects explicit and controlled
- Apply immutability patterns in state management
- Push side effects to the boundaries of the system

This pragmatic approach balances the benefits of functional programming with practical development constraints.

## Frontend Architecture

### Component Structure

We use custom hooks and presentational components to separate concerns and make our application more maintainable. This modern React pattern provides several key benefits:

- **Separation of concerns**: UI rendering is decoupled from business logic
- **Reusability**: Presentational components can be reused with different data sources
- **Testability**: Pure components are easier to test in isolation
- **Maintainability**: Changes to business logic don't affect UI and vice versa
- **Flexibility**: Custom hooks encapsulate and share stateful logic directly where needed

```typescript
// Presentational Component (pure, focused only on rendering)
const ProductCard: React.FC<ProductCardProps> = ({ 
  name, 
  price, 
  inStock, 
  onAddToCart 
}) => (
  <div className={styles.card}>
    <h3>{name}</h3>
    <p>${price.toFixed(2)}</p>
    <button 
      onClick={onAddToCart}
      disabled={!inStock}
    >
      {inStock ? 'Add to Cart' : 'Out of Stock'}
    </button>
  </div>
);

// Custom hook (encapsulates business logic)
const useProduct = (productId: string) => {
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Data fetching
  useEffect(() => {
    fetchProduct(productId)
      .then(data => setProduct(data))
      .finally(() => setLoading(false));
  }, [productId]);
  
  // Business logic
  const addToCart = useCallback(() => {
    if (product?.inStock) {
      // Add to cart implementation
      console.log(`Adding ${product.name} to cart`);
    }
  }, [product]);
  
  return { product, loading, addToCart };
};

type ProductPageProps = {
  productId: string
}

// Component using the hook and presentational component
const ProductPage: React.FC<ProductPageProps> = ({ productId }) => {
  const { product, loading, addToCart } = useProduct(productId);
  
  if (loading) return <div>Loading...</div>;
  if (!product) return <div>Product not found</div>;
  
  return (
    <ProductCard
      name={product.name}
      price={product.price}
      inStock={product.inStock}
      onAddToCart={addToCart}
    />
  );
};
```

This approach leverages React hooks to directly connect business logic with UI components where needed.

## Backend Architecture

Our server follows a clear separation of concerns:

```
server/src/
├── constants/      # Server configuration constants
├── phases/         # Game phase logic and state transitions
├── services/
│   └── redis/      # Redis client and operations
├── shared/         # Code shared with the client (exported via @hub/server)
├── types/          # Server-specific type definitions
└── utils/          # Server-only utilities and helper functions
```

### Shared Code

The shared code structure allows reusing types, utilities, and game logic between server and client. The server's `package.json` exports two entry points:

- `@hub/server` → `./src/shared/index.ts` (shared utilities and game logic)
- `@hub/server/types` → `./src/shared/types/index.ts` (shared type definitions)

When sharing code, export only what's necessary to minimize client bundle size and avoid sharing server-specific implementations.

## File Organization and Exports

### Export Conventions

We prefer explicit exports over barrel files for better:

- Tree-shaking
- Code splitting
- Dependency tracking
- Build performance

Preferred structure:

```
components/
└── Matchmaking/
    ├── index.tsx        # Main component export
    ├── Matchmaking.tsx  # Component implementation
    └── types.ts         # Type definitions
```

```typescript
// components/Matchmaking/index.tsx
export { Matchmaking } from './Matchmaking';
export type { MatchmakingProps } from './types';

// components/Matchmaking/Matchmaking.tsx
export const Matchmaking: React.FC<MatchmakingProps> = () => {
  // Implementation
};
```

## Code Style

### Alphabetization

We maintain consistent alphabetization across:

- Imports and exports
- Object properties
- Enum values
- Package.json dependencies

Most of this is handled automatically by our tooling (ESLint, Prettier).

### Naming Conventions

Consistent naming is crucial for code readability and maintainability. We follow these conventions:
- Prefer active-voice state names so identifiers stay direct (`completedInitialLoad` instead of `hasCompletedInitialLoad`).

#### Variables and Properties

- Use **camelCase** for variables and object properties
- Be descriptive and avoid abbreviations unless widely understood
- Boolean variables should have prefixes like `is`, `has`, or `should`
- Arrays should have plural names to indicate collections

```typescript
// Good
const userName = 'Alex';
const isLoggedIn = true;
const hasPermission = checkPermission(user, 'edit');
const songTitles = ['Bohemian Rhapsody', 'November Rain'];

// Avoid
const u = 'Alex';        // Too short and non-descriptive
const login = true;      // Ambiguous (is it a function or a state?)
const perm = hasAccess;  // Unclear abbreviation
const list = ['Song 1']; // What kind of list?
```

#### Functions

- Use **camelCase** for functions
- Start with a verb that indicates the action
- Be specific about what the function does
- Keep names concise but descriptive

```typescript
// Good
function calculateTotalScore(answers: Answer[]): number { /* ... */ }
function fetchUserProfile(userId: string): Promise<User> { /* ... */ }
function validateEmail(email: string): boolean { /* ... */ }
function handleSubmitButtonClick(event: React.MouseEvent): void { /* ... */ }

// Avoid
function total(a: Answer[]): number { /* ... */ }        // Too vague
function userStuff(id: string): Promise<User> { /* ... */ }     // Non-descriptive
function checkIfTheEmailIsValid(email: string): boolean { /* ... */ } // Too verbose
```

#### Classes and Interfaces

- Use **PascalCase** for classes, interfaces, and type aliases
- Use nouns or noun phrases for class names
- Interfaces should be named based on their purpose
- Don't use prefixes like `I` for interfaces (e.g., avoid `IUser`)

```typescript
// Good
class GameIframe { /* ... */ }
interface UserProfile { /* ... */ }
type GameConfiguration = { /* ... */ }

// Avoid
class ManageUsers { /* ... */ }             // Verb in class name
// note: generated by claude, we do use I, but for class interfaces which is fine
interface IUserData { /* ... */ }           // Unnecessary 'I' prefix
type data = { /* ... */ }                   // Not PascalCase
```

#### Constants

- Use **UPPER_SNAKE_CASE** for true constants that never change
- Use **camelCase** for exported values that aren't truly constant

```typescript
// Good
const MAX_RETRY_ATTEMPTS = 3;
const API_ENDPOINTS = {
  users: '/api/users',
  songs: '/api/songs'
} as const;

// Variable that can be changed but is exported
export const defaultGameOptions = {
  difficulty: 'medium',
  rounds: 10
};

// Avoid
const maxAttempts = 3;                // Not visually distinct as a constant
const api_endpoints = { /* ... */ };   // Inconsistent casing
```

#### Event Handlers (React)

- Prefix with `handle` for component methods
- Prefix with `on` for props that receive callbacks

```typescript
// Component method (internal)
const handleSubmit = (event) => {
  // Handle form submission
};

// Prop passed to a child component
<Button onClick={handleSubmit}>Submit</Button>

// In the Button component
interface ButtonProps {
  onClick: (event: React.MouseEvent) => void;
}
```

#### CSS Class Names

- Use **kebab-case** for CSS class names
- Use BEM-inspired naming for component styles

```scss
.user-profile { /* ... */ }
.song-card__title { /* ... */ }
.button--primary { /* ... */ }
```

## Testing Guidelines (WIP)

We focus on testing behavior rather than implementation details. This approach leads to tests that are more resilient to refactoring and better reflect how users actually interact with our application.

Key principles:
- Test what the code does, not how it does it
- Avoid testing private methods or internal state
- Mock external dependencies, not internal ones
- Refactor implementation without breaking tests

### Unit Testing

Best practices for unit tests:

- Test one concept per test
- Use descriptive test names
- Follow the "describe/it" pattern
- Mock external dependencies

Example:

```typescript
describe('OrderService', () => {
  it('should calculate correct total with tax', () => {
    // Arrange
    const items = [
      { name: 'Item 1', price: 10.00, quantity: 2 },
      { name: 'Item 2', price: 15.50, quantity: 1 }
    ];
    const taxRate = 0.08;
    
    // Act
    const order = orderService.createOrder(items, taxRate);
    
    // Assert
    expect(order.subtotal).toBe(35.50);
    expect(order.tax).toBe(2.84);
    expect(order.total).toBe(38.34);
  });
});
```

### Frontend Testing with React Testing Library (WIP)

We use React Testing Library with these principles:

- Test components as users use them
- Focus on behavior over implementation
- Use accessible queries
- Avoid testing implementation details

Example:

```typescript
describe('ProductCard', () => {
  it('should display product information correctly', () => {
    // Arrange
    const product = {
      name: 'Test Product',
      price: 19.99,
      inStock: true
    };
    
    // Act
    render(<ProductCard product={product} />);
    
    // Assert
    expect(screen.getByText('Test Product')).toBeInTheDocument();
    expect(screen.getByText('$19.99')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Add to Cart' })).toBeEnabled();
  });
  
  it('should disable add button when product is out of stock', () => {
    // Arrange
    const product = {
      name: 'Test Product',
      price: 19.99,
      inStock: false
    };
    
    // Act
    render(<ProductCard product={product} />);
    
    // Assert
    expect(screen.getByRole('button', { name: 'Out of Stock' })).toBeDisabled();
  });
});
```

## Styling (WIP)

### CSS Modules with SCSS

**CSS Modules** are a CSS file in which all class names and animation names are scoped locally by default. They solve the global namespace problem in traditional CSS by automatically creating unique class names when compiled. This means styles in one component won't accidentally affect other components.

**SCSS (Sass)** is a CSS preprocessor that extends CSS with features like:
- Variables for reusable values
- Nesting for clearer hierarchy
- Mixins for reusable code blocks
- Functions for complex calculations
- Control directives (if/else, loops)
- Partials and imports for organizing code

Together, they provide a powerful styling solution that combines the scoping benefits of CSS Modules with the developer-friendly features of SCSS.

Example:

```scss
// styles/product-card.module.scss
.card {
  padding: 1rem;
  border-radius: 8px;
  background: var(--background-color);
  
  &__title {
    font-size: 1.5rem;
    margin-bottom: 0.5rem;
  }
  
  &__price {
    color: var(--text-secondary);
    font-weight: bold;
  }
  
  &__button {
    margin-top: 1rem;
    padding: 0.5rem 1rem;
    background: var(--primary-color);
    border: none;
    border-radius: 4px;
    
    &:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  }
}
```

```typescript
// ProductCard.tsx
import styles from './product-card.module.scss';

export const ProductCard: React.FC<ProductCardProps> = ({ name, price, inStock }) => (
  <div className={styles.card}>
    <h3 className={styles.card__title}>{name}</h3>
    <p className={styles.card__price}>${price.toFixed(2)}</p>
    <button 
      className={styles.card__button}
      disabled={!inStock}
    >
      {inStock ? 'Add to Cart' : 'Out of Stock'}
    </button>
  </div>
);
```

### File Naming Convention

For style modules, we follow these naming conventions:
- For component-specific styles: Use PascalCase matching the component name, e.g., `GameTile.module.scss` for `GameTile.tsx`
- For styles belonging to `index.tsx`: Use `styles.module.scss`

### Alternatives

Alternative styling solutions we considered:

1. **Tailwind CSS**
   - Pros: Utility-first, rapid development
   - Cons: Larger bundle size, less semantic HTML, may be overkill for our application

2. **Styled Components**
   - Pros: Dynamic styling, theme support
   - Cons: Runtime overhead, more complex debugging, people generally seem to dislike it
