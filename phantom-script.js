var fakeNavigator = {};
for (var i in navigator) {
    fakeNavigator[i] = navigator[i];
}
fakeNavigator.onLine = true;
window.navigator = fakeNavigator;
