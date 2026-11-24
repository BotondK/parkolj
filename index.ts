import { registerRootComponent } from 'expo';

import Root from './Root';
import { registerWidgets } from './src/widgets/register';

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(Root);

// Android kezdőképernyő-widgetek: a rendszer az app futása nélkül is meghívhatja (register.android.ts)
registerWidgets();
