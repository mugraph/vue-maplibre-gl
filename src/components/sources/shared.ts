import { onBeforeUnmount, ref, Ref, unref, watch } from 'vue';
import { SourceSpecification, Source, Map as GlMap } from 'maplibre-gl';
import { MglEvents } from '@/components/types';
import { Emitter } from 'mitt';
import { SourceLayerRegistry } from '@/components/sources/sourceLayer.registry';

export function genSourceOpts<T extends object, O extends object>(type: string, props: object, sourceOpts: Array<keyof O>): T {
	return Object.keys(props)
		.filter((opt) => (props as any)[opt] !== undefined && sourceOpts.indexOf(opt as any) !== -1)
		.reduce(
			(obj, opt) => {
				(obj as any)[opt] = unref((props as any)[opt]);
				return obj;
			},
			{ type } as T
		);
}

const sourcesRefs = new Map<string, Ref<Source | undefined | null>>();

export function getSourceRef<T = Source>(mcid: number, source: any): Ref<T | undefined | null> {
	const isString = typeof source === 'string';
	const key = String(mcid) + (isString ? source : '');
	let r = sourcesRefs.get(key);
	if (!r) {
		r = ref(isString ? null : undefined);
		sourcesRefs.set(key, r);
	}
	return r as Ref<T | undefined | null>;
}

export function bindSource<T extends object, O extends object>(
	map: Ref<GlMap>,
	source: Ref<Source | undefined | null>,
	isLoaded: Ref<boolean>,
	emitter: Emitter<MglEvents>,
	props: any,
	type: string,
	sourceOpts: Array<keyof O>,
	registry: SourceLayerRegistry
) {
	function addSource() {
		if (isLoaded.value) {
			map.value.addSource(props.sourceId, genSourceOpts<T, O>(type, props, sourceOpts) as SourceSpecification);
			source.value = map.value.getSource(props.sourceId);
		}
	}

	function resetSource() {
		source.value = null;
	}

	watch(isLoaded, addSource, { immediate: true });
	map.value.on('style.load', addSource);
	emitter.on('styleSwitched', resetSource);

	return onBeforeUnmount(() => {
		if (isLoaded.value) {
			registry.unmount();
			map.value.removeSource(props.sourceId);
		}
		map.value.off('style.load', addSource);
		emitter.off('styleSwitched', resetSource);
	});
}
