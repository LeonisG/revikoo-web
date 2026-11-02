"""Geometry regression tests plus adversarial cases for the validator."""
import unittest,copy,math
from spatial_v3 import *
from audit_layout_v3 import connections

class LayoutTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.w=World();cls.layout=json.loads((ROOT/'layout.json').read_text());cls.items=json.loads((ROOT/'placements.json').read_text());cls.report=json.loads((ROOT/'spatial-audit.json').read_text())
    def test_final_scene_has_no_spatial_errors(self):self.assertEqual(self.report['issues'],[])
    def test_all_accesses_connected_and_removing_a_bridge_is_detected(self):
        self.assertEqual(connections(self.layout),[])
        broken=copy.deepcopy(self.layout);broken['paths']['edges']=[e for e in broken['paths']['edges'] if e['id']!='bridge-stone'];self.assertIn('town-hall',connections(broken))
    def test_oriented_footprints_detect_crossed_benches_with_different_centers(self):
        p={'asset':'BENCH','scale':1,'angle':0,'position':[0,0,2]};q={**p,'position':[1,0,2],'angle':math.pi/2}
        self.assertGreater(footprint(p,self.w.metrics).intersection(footprint(q,self.w.metrics)).area,.1)
        q['position']=[4,0,2];self.assertEqual(footprint(p,self.w.metrics).intersection(footprint(q,self.w.metrics)).area,0)
    def test_bench_front_is_negative_y_and_access_rejects_a_pot(self):
        b=next(p for p in self.items if p['id']=='plaza-bench-01');x,y,z=b['position'];a=b['angle'];target=self.layout['plaza']['center'];dx,dy=target[0]-x,target[1]-y
        self.assertAlmostEqual((math.sin(a)*dx-math.cos(a)*dy)/math.hypot(dx,dy),1,places=6)
        q={'id':'blocking-pot','asset':'POT','xy':[x+math.sin(a)*1.3,y-math.cos(a)*1.3],'scale':.6};q=self.w.resolved(q)
        self.assertTrue(any('BENCH_ACCESS' in r for r in self.w.reject(q,[b])))
    def test_future_plots_reject_new_permanent_objects(self):
        for p in self.layout['plots']:
            q=self.w.resolved({'id':'intruder','asset':'TREE_01','xy':p['position'][:2]});self.assertTrue(any('FUTURE_BUILDING' in r for r in self.w.reject(q,[])))
    def test_low_planting_below_canopy_is_not_a_trunk_collision(self):
        tree={'asset':'TREE_01','scale':1,'angle':0,'position':[0,0,1.8]};flower={'asset':'FLOWER_WHITE','scale':.6,'angle':0,'position':[1.5,0,1.8]}
        a,b=collision_footprints(tree,flower,self.w.metrics);self.assertEqual(a.intersection(b).area,0)
    def test_river_mesh_and_banks_share_the_same_sampled_line(self):
        r=self.layout['river']['samples'];self.assertEqual(len(r),201)
        self.assertTrue(all(a['position'][2]>=b['position'][2] for a,b in zip(r,r[1:])))
        self.assertTrue(all(math.dist(a['position'][:2],b['position'][:2])<.4 for a,b in zip(r,r[1:])))
        self.assertTrue(self.report['checks']['riverEndsAtBoundary'])
    def test_bridge_decks_reach_land_without_steps(self):
        for b in self.report['checks']['bridgeConnections']:
            self.assertTrue(b['bankEndpointsOnLand']);self.assertLess(b['endpointStep'],.02);self.assertGreater(b['waterClearance'],.5)
    def test_unique_ids_and_measured_support(self):
        self.assertEqual(len(self.items),len({p['id'] for p in self.items}))
        for p in self.report['objects']:
            if p.get('support')=='cliff-embedded' or p['asset'].startswith('BRIDGE'):continue
            self.assertIsNotNone(p['supportHeight']);self.assertLess(abs(p['contactHeight']-p['supportHeight']),.31*p['scale'] if p['asset']=='ROCK' else .06)
    def test_plaza_pavers_have_no_overlap(self):self.assertLess(self.report['checks']['tileOverlapArea'],1e-6)
    def test_coastal_rocks_touch_the_cliff_with_their_oriented_footprint(self):
        rocks=[p for p in self.items if p.get('support')=='cliff-embedded']
        for p in rocks:self.assertTrue(footprint(p,self.w.metrics).intersects(self.w.boundary.boundary))
        floating=copy.deepcopy(rocks[0]);floating['position']=[80,80,-1]
        self.assertIn('UNSUPPORTED_CLIFF',self.w.reject(floating,[]))

if __name__=='__main__':unittest.main()
